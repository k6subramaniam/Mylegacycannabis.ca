/**
 * ID Verification REST API Routes
 * Handles guest + registered user ID uploads, QR mobile bridge, and admin review.
 */
import { Router, Express } from "express";
import multer from "multer";
import crypto from "crypto";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ============================================================
// IN-MEMORY STORE
// ============================================================

export interface Verification {
  id: string;
  email: string;
  userId: string | null;
  status: "pending_review" | "approved" | "rejected";
  imagePath: string;
  documentType: string;
  rejectionReason: string | null;
  adminNotes: string | null;
  reviewedBy: string | null;
  reviewedAt: string | null;
  mobileToken: string | null;
  verificationToken: string;
  reminders: { hr1: boolean; hr4: boolean; hr10: boolean };
  ip: string;
  userAgent: string;
  createdAt: string;
  expiresAt: string;
}

export interface MobileSession {
  token: string;
  email: string;
  userId: string | null;
  status: "waiting" | "submitted";
  verificationId: string | null;
  createdAt: number;
}

export const verifications = new Map<string, Verification>();
export const mobileSessions = new Map<string, MobileSession>();

// Admin key — set via env or default for prototype
const ADMIN_KEY = process.env.ADMIN_KEY || "legacy420admin";

// ============================================================
// FILE UPLOAD CONFIG
// ============================================================

const uploadsDir = path.resolve(__dirname, "..", "..", "uploads", "id-documents");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadsDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname) || ".jpg";
    cb(null, `idv_${crypto.randomUUID()}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (_req, file, cb) => {
    const allowed = ["image/jpeg", "image/png", "image/webp", "image/jpg"];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Invalid file type. Upload JPG, PNG, or WebP."));
    }
  },
});

// ============================================================
// ROUTER
// ============================================================

export function registerVerifyRoutes(router: Express | Router) {
  // --------------------------------------------------------
  // Submit ID for review (registered or guest)
  // --------------------------------------------------------
  router.post("/api/verify/submit", upload.single("id_document"), (req, res) => {
    try {
      const file = req.file;
      if (!file) {
        return res.status(400).json({ error: "No file uploaded." });
      }

      const email = (req.body.email || "").trim().toLowerCase();
      if (!email || !email.includes("@")) {
        fs.unlinkSync(file.path);
        return res.status(400).json({ error: "A valid email address is required." });
      }

      const userId = req.body.userId || null;
      const documentType = req.body.documentType || "government_id";

      const id = crypto.randomUUID().slice(0, 12);
      const verificationToken = crypto.randomBytes(32).toString("hex");

      const verification: Verification = {
        id,
        email,
        userId,
        status: "pending_review",
        imagePath: file.filename,
        documentType,
        rejectionReason: null,
        adminNotes: null,
        reviewedBy: null,
        reviewedAt: null,
        mobileToken: null,
        verificationToken,
        reminders: { hr1: false, hr4: false, hr10: false },
        ip: (req.headers["x-forwarded-for"] as string) || req.ip || "0.0.0.0",
        userAgent: req.headers["user-agent"] || "",
        createdAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
      };

      verifications.set(id, verification);

      console.log(`[VERIFY] New submission #${id} from ${email} — file: ${file.filename}`);
      console.log(`[VERIFY] Admin review URL: /admin/verify?key=${ADMIN_KEY}`);

      res.json({
        success: true,
        verificationId: id,
        message: "Your ID has been submitted for review. We will email you once our team has reviewed your document.",
      });
    } catch (err: any) {
      console.error("[VERIFY] Submit error:", err);
      res.status(500).json({ error: "Upload failed. Please try again." });
    }
  });

  // --------------------------------------------------------
  // Check verification status by ID
  // --------------------------------------------------------
  router.get("/api/verify/status/:id", (req, res) => {
    const v = verifications.get(req.params.id);
    if (!v) return res.status(404).json({ error: "Not found" });

    res.json({
      id: v.id,
      status: v.status,
      email: v.email,
      rejectionReason: v.rejectionReason,
      createdAt: v.createdAt,
      reviewedAt: v.reviewedAt,
    });
  });

  // --------------------------------------------------------
  // Check verification by email or token
  // --------------------------------------------------------
  router.get("/api/verify/check", (req, res) => {
    const email = ((req.query.email as string) || "").trim().toLowerCase();
    const token = (req.query.token as string) || "";

    if (token) {
      const v = Array.from(verifications.values()).find(v => v.verificationToken === token);
      if (v) {
        return res.json({ id: v.id, status: v.status, email: v.email });
      }
    }

    if (email) {
      const matches = Array.from(verifications.values())
        .filter(v => v.email === email)
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      if (matches.length > 0) {
        const v = matches[0];
        return res.json({ id: v.id, status: v.status, email: v.email });
      }
    }

    res.json({ id: null, status: null });
  });

  // --------------------------------------------------------
  // QR Bridge — Create mobile upload session
  // --------------------------------------------------------
  router.post("/api/verify/mobile-session", (req, res) => {
    const email = (req.body.email || "").trim().toLowerCase();
    const userId = req.body.userId || null;

    const token = crypto.randomBytes(16).toString("hex");

    const session: MobileSession = {
      token,
      email,
      userId,
      status: "waiting",
      verificationId: null,
      createdAt: Date.now(),
    };

    mobileSessions.set(token, session);

    // Clean up expired sessions (>30 min)
    for (const [k, s] of mobileSessions) {
      if (Date.now() - s.createdAt > 30 * 60 * 1000) mobileSessions.delete(k);
    }

    const baseUrl = process.env.RAILWAY_PUBLIC_DOMAIN
      ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN}`
      : `${req.protocol}://${req.get("host")}`;

    res.json({
      success: true,
      mobileToken: token,
      mobileUrl: `${baseUrl}/verify-mobile?t=${token}`,
    });
  });

  // --------------------------------------------------------
  // QR Bridge — Poll mobile session status
  // --------------------------------------------------------
  router.get("/api/verify/mobile-poll/:token", (req, res) => {
    const session = mobileSessions.get(req.params.token);
    if (!session) return res.json({ status: "expired" });
    if (Date.now() - session.createdAt > 30 * 60 * 1000) {
      mobileSessions.delete(req.params.token);
      return res.json({ status: "expired" });
    }
    res.json({ status: session.status, verificationId: session.verificationId });
  });

  // --------------------------------------------------------
  // QR Bridge — Mobile submit (phone uploads here)
  // --------------------------------------------------------
  router.post("/api/verify/mobile-submit", upload.single("id_document"), (req, res) => {
    try {
      const mobileToken = req.body.mobile_token || "";
      const session = mobileSessions.get(mobileToken);

      if (!session) {
        if (req.file) fs.unlinkSync(req.file.path);
        return res.status(400).json({ error: "Session expired. Generate a new QR code." });
      }

      if (session.status !== "waiting") {
        if (req.file) fs.unlinkSync(req.file.path);
        return res.status(400).json({ error: "Already submitted." });
      }

      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded." });
      }

      const email = (req.body.email || session.email || "").trim().toLowerCase() || "guest@unknown.com";
      const id = crypto.randomUUID().slice(0, 12);
      const verificationToken = crypto.randomBytes(32).toString("hex");

      const verification: Verification = {
        id,
        email,
        userId: session.userId,
        status: "pending_review",
        imagePath: req.file.filename,
        documentType: req.body.documentType || "government_id",
        rejectionReason: null,
        adminNotes: null,
        reviewedBy: null,
        reviewedAt: null,
        mobileToken,
        verificationToken,
        reminders: { hr1: false, hr4: false, hr10: false },
        ip: (req.headers["x-forwarded-for"] as string) || req.ip || "0.0.0.0",
        userAgent: req.headers["user-agent"] || "",
        createdAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
      };

      verifications.set(id, verification);

      // Update mobile session
      session.status = "submitted";
      session.verificationId = id;
      mobileSessions.set(mobileToken, session);

      console.log(`[VERIFY] Mobile submission #${id} from ${email} via QR bridge`);

      res.json({
        success: true,
        verificationId: id,
        message: "Your ID has been submitted. You can close this page and return to your computer.",
      });
    } catch (err: any) {
      console.error("[VERIFY] Mobile submit error:", err);
      res.status(500).json({ error: "Upload failed." });
    }
  });

  // --------------------------------------------------------
  // Admin — List all verifications
  // --------------------------------------------------------
  router.get("/api/admin/verifications", (req, res) => {
    const key = req.query.key || req.headers["x-admin-key"];
    if (key !== ADMIN_KEY) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const status = (req.query.status as string) || "all";
    let list = Array.from(verifications.values()).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    if (status !== "all") {
      list = list.filter(v => v.status === status);
    }

    res.json({
      total: list.length,
      pending: Array.from(verifications.values()).filter(v => v.status === "pending_review").length,
      verifications: list,
    });
  });

  // --------------------------------------------------------
  // Admin — Serve ID image (authenticated)
  // --------------------------------------------------------
  router.get("/api/admin/image/:filename", (req, res) => {
    const key = req.query.key || req.headers["x-admin-key"];
    if (key !== ADMIN_KEY) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const filename = path.basename(req.params.filename);
    const filepath = path.join(uploadsDir, filename);

    if (!fs.existsSync(filepath)) {
      return res.status(404).json({ error: "File not found" });
    }

    res.sendFile(filepath);
  });

  // --------------------------------------------------------
  // Admin — Approve or Reject
  // --------------------------------------------------------
  router.post("/api/admin/review", (req, res) => {
    const key = req.body.key || req.headers["x-admin-key"];
    if (key !== ADMIN_KEY) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const { id, decision, reason, notes } = req.body;
    const v = verifications.get(id);
    if (!v) return res.status(404).json({ error: "Verification not found" });
    if (v.status !== "pending_review") {
      return res.status(400).json({ error: "Already reviewed" });
    }

    if (decision === "approve") {
      v.status = "approved";
      v.reviewedBy = "admin";
      v.reviewedAt = new Date().toISOString();
      v.adminNotes = notes || null;
      verifications.set(id, v);

      console.log(`[ADMIN] Approved #${id} — ${v.email}`);
      const returnUrl = `${req.protocol}://${req.get("host")}/checkout?vtoken=${v.verificationToken}`;
      console.log(`[ADMIN] Customer return link: ${returnUrl}`);

      res.json({ success: true, message: `Approved. Customer (${v.email}) has been notified.` });
    } else if (decision === "reject") {
      if (!reason) {
        return res.status(400).json({ error: "Rejection reason required." });
      }
      v.status = "rejected";
      v.rejectionReason = reason;
      v.reviewedBy = "admin";
      v.reviewedAt = new Date().toISOString();
      v.adminNotes = notes || null;
      verifications.set(id, v);

      console.log(`[ADMIN] Rejected #${id} — ${v.email} — Reason: ${reason}`);

      res.json({ success: true, message: `Rejected. Customer (${v.email}) has been notified.` });
    } else {
      res.status(400).json({ error: "Invalid decision" });
    }
  });
}
