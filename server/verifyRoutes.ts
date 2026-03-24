/**
 * ID Verification REST API Routes
 * Handles guest + registered user ID uploads and QR mobile bridge.
 * All submissions go into db.createVerification() — the same store
 * the admin panel reads at /admin/verifications (tRPC-based, login required).
 */
import { Router, Express } from "express";
import multer from "multer";
import crypto from "crypto";
import * as db from "./db";
import { storagePut } from "./storage";
import { notifyOwner } from "./_core/notification";

// ============================================================
// MULTER — memory storage, we forward buffer to storagePut
// ============================================================

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
  fileFilter: (_req, file, cb) => {
    const allowed = ["image/jpeg", "image/png", "image/webp", "image/jpg"];
    if (allowed.includes(file.mimetype)) cb(null, true);
    else cb(new Error("Invalid file type. Upload JPG, PNG, or WebP."));
  },
});

// ============================================================
// QR MOBILE SESSION STORE  (short-lived, in-memory)
// ============================================================

export interface MobileSession {
  token: string;
  email: string;
  userId: number | null;
  status: "waiting" | "submitted";
  verificationId: number | null;
  createdAt: number;
}

export const mobileSessions = new Map<string, MobileSession>();

function cleanExpiredSessions() {
  const cutoff = Date.now() - 30 * 60 * 1000;
  for (const [k, s] of mobileSessions) {
    if (s.createdAt < cutoff) mobileSessions.delete(k);
  }
}

// ============================================================
// HELPERS
// ============================================================

async function saveImageToStorage(buffer: Buffer, mimetype: string, prefix: string): Promise<string> {
  const { nanoid } = await import("nanoid");
  const ext = mimetype === "image/png" ? "png" : mimetype === "image/webp" ? "webp" : "jpg";
  const key = `id-verifications/${prefix}-${nanoid()}.${ext}`;
  const { url } = await storagePut(key, buffer, mimetype);
  return url;
}

// ============================================================
// ROUTER
// ============================================================

export function registerVerifyRoutes(app: Express | Router) {

  // ──────────────────────────────────────────────────────────
  // POST /api/verify/submit
  // Guest upload — saves to shared DB so admin sees it
  // ──────────────────────────────────────────────────────────
  app.post("/api/verify/submit", upload.single("id_document"), async (req, res) => {
    try {
      // Check if ID verification is enabled
      const idVerifEnabled = await db.isIdVerificationEnabled();
      if (!idVerifEnabled) {
        return res.json({
          success: true,
          verificationId: 0,
          message: "ID verification is not currently required. You can place orders directly.",
          skipped: true,
        });
      }

      const file = req.file;
      if (!file) return res.status(400).json({ error: "No file uploaded." });

      const email = (req.body.email || "").trim().toLowerCase();
      if (!email || !email.includes("@")) {
        return res.status(400).json({ error: "A valid email address is required." });
      }

      const userId    = req.body.userId ? parseInt(req.body.userId, 10) || undefined : undefined;
      const guestName = (req.body.guestName || "").trim() || undefined;
      const idType    = req.body.documentType || "government_id";

      const frontImageUrl = await saveImageToStorage(file.buffer, file.mimetype, "guest-front");

      const dbId = await db.createVerification({
        userId,
        guestEmail: email,
        guestName,
        frontImageUrl,
        idType,
      });

      notifyOwner({
        title: "New ID Verification Submitted",
        content: `Verification #${dbId} from ${guestName || email} needs review at /admin/verifications`,
      }).catch(() => {});

      console.log(`[VERIFY] Guest submission #${dbId} from ${email}`);
      res.json({ success: true, verificationId: dbId, message: "Your ID has been submitted for review." });
    } catch (err: any) {
      console.error("[VERIFY] Submit error:", err);
      res.status(500).json({ error: "Upload failed. Please try again." });
    }
  });

  // ──────────────────────────────────────────────────────────
  // GET /api/verify/status/:id
  // ──────────────────────────────────────────────────────────
  app.get("/api/verify/status/:id", async (req, res) => {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return res.status(400).json({ error: "Invalid ID." });
    const v = await db.getVerificationById(id);
    if (!v) return res.status(404).json({ error: "Not found." });
    res.json({ id: v.id, status: v.status, email: v.guestEmail, reviewedAt: v.reviewedAt });
  });

  // ──────────────────────────────────────────────────────────
  // GET /api/verify/check?email=
  // Used by IDVerification page on mount to restore status
  // ──────────────────────────────────────────────────────────
  app.get("/api/verify/check", async (req, res) => {
    const email = ((req.query.email as string) || "").trim().toLowerCase();
    const token = ((req.query.token as string) || "").trim();

    // If a token is provided, check the verification by token (for email approval links)
    if (token) {
      // Token-based lookup — not implemented yet, return null
      return res.json({ id: null, status: null });
    }

    if (email) {
      const result = await db.getAllVerifications({ email, limit: 1 });
      const match = result.data[0];
      if (match) {
        return res.json({ id: match.id, status: match.status, email: match.guestEmail });
      }
    }

    res.json({ id: null, status: null });
  });

  // ──────────────────────────────────────────────────────────
  // POST /api/verify/mobile-session
  // QR Bridge — creates a short-lived session, returns QR URL
  // ──────────────────────────────────────────────────────────
  app.post("/api/verify/mobile-session", (req, res) => {
    const email  = (req.body.email  || "").trim().toLowerCase();
    const userId = req.body.userId  ? parseInt(req.body.userId, 10) || null : null;

    cleanExpiredSessions();

    const token: string = crypto.randomBytes(16).toString("hex");
    mobileSessions.set(token, {
      token, email, userId,
      status: "waiting",
      verificationId: null,
      createdAt: Date.now(),
    });

    const baseUrl = process.env.RAILWAY_PUBLIC_DOMAIN
      ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN}`
      : `${req.protocol}://${req.get("host")}`;

    res.json({ success: true, mobileToken: token, mobileUrl: `${baseUrl}/verify-mobile?t=${token}` });
  });

  // ──────────────────────────────────────────────────────────
  // GET /api/verify/mobile-poll/:token
  // ──────────────────────────────────────────────────────────
  app.get("/api/verify/mobile-poll/:token", (req, res) => {
    const session = mobileSessions.get(req.params.token);
    if (!session || Date.now() - session.createdAt > 30 * 60 * 1000) {
      if (session) mobileSessions.delete(req.params.token);
      return res.json({ status: "expired" });
    }
    res.json({ status: session.status, verificationId: session.verificationId });
  });

  // ──────────────────────────────────────────────────────────
  // POST /api/verify/mobile-submit
  // Phone uploads ID via QR — saves to shared DB
  // ──────────────────────────────────────────────────────────
  app.post("/api/verify/mobile-submit", upload.single("id_document"), async (req, res) => {
    try {
      // Check if ID verification is enabled
      const idVerifEnabled = await db.isIdVerificationEnabled();
      if (!idVerifEnabled) {
        return res.json({
          success: true,
          verificationId: 0,
          message: "ID verification is not currently required.",
          skipped: true,
        });
      }

      const mobileToken = req.body.mobile_token || "";
      const session = mobileSessions.get(mobileToken);

      if (!session || Date.now() - session.createdAt > 30 * 60 * 1000) {
        return res.status(400).json({ error: "Session expired. Generate a new QR code." });
      }
      if (session.status !== "waiting") {
        return res.status(400).json({ error: "Already submitted." });
      }
      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded." });
      }

      const email = (req.body.email || session.email || "").trim().toLowerCase() || "guest@unknown.com";

      const frontImageUrl = await saveImageToStorage(req.file.buffer, req.file.mimetype, "mobile-front");

      const dbId = await db.createVerification({
        userId: session.userId ?? undefined,
        guestEmail: email,
        frontImageUrl,
        idType: "government_id",
      });

      session.status = "submitted";
      session.verificationId = dbId;
      mobileSessions.set(mobileToken, session);

      notifyOwner({
        title: "New ID Verification Submitted (Mobile QR)",
        content: `Verification #${dbId} from ${email} via QR bridge needs review at /admin/verifications`,
      }).catch(() => {});

      console.log(`[VERIFY] Mobile submission #${dbId} from ${email} via QR bridge`);
      res.json({ success: true, verificationId: dbId, message: "Your ID has been submitted. You can close this page and return to your computer." });
    } catch (err: any) {
      console.error("[VERIFY] Mobile submit error:", err);
      res.status(500).json({ error: "Upload failed." });
    }
  });
}
