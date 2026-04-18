const fs = require("fs");

const content = fs.readFileSync("server/db.ts", "utf8");

const targetFunction = `export async function checkNewsletterSubscriber(
  email: string
): Promise<boolean> {
  if (!USE_PERSISTENT_DB) return true;
  const normalizedEmail = email.toLowerCase().trim();
  const db = getDb();
  try {
    const existing = await db
      .select()
      .from(schema.newsletterSubscribers)
      .where(eq(schema.newsletterSubscribers.email, normalizedEmail))
      .limit(1);
    if (existing.length > 0) {
      return existing[0].isActive;
    }
    return false; // If not in table, not subscribed
  } catch (err) {
    console.error("[DB] Failed to check newsletter status:", err);
    return true; // Fail open to allow normal transactional emails if needed, or false? Let's say true for safety on promotional, or false?
    // Actually, usually it's true if we fail to check. Let's return true.
  }
}

export async function unsubscribeNewsletter(email: string): Promise<void> {`;
const replacementFunction = `export async function unsubscribeNewsletter(email: string): Promise<void> {`;

if (content.includes(targetFunction)) {
  fs.writeFileSync(
    "server/db.ts",
    content.replace(targetFunction, replacementFunction)
  );
  console.log(
    "Successfully reverted checkNewsletterSubscriber in server/db.ts"
  );
} else {
  console.log("Target function not found in server/db.ts");
}
