#!/usr/bin/env node
/**
 * Quick test to verify the DATABASE_URL connection works.
 * Usage: node scripts/test-db-connection.mjs
 * (reads from .env or environment)
 */
import "dotenv/config";
import postgres from "postgres";

const url = process.env.DATABASE_URL;

if (!url) {
  console.error(
    "DATABASE_URL is not set. Set it in .env or as an environment variable."
  );
  process.exit(1);
}

console.log("Connecting to PostgreSQL...");
console.log(`  Host: ${url.replace(/:[^:@]+@/, ":***@")}`);

try {
  const sql = postgres(url, { max: 1, connect_timeout: 10, idle_timeout: 5 });

  const [result] =
    await sql`SELECT NOW() as now, current_database() as db, version() as version`;

  console.log("\nConnection successful!");
  console.log(`  Database: ${result.db}`);
  console.log(`  Time:     ${result.now}`);
  console.log(`  Version:  ${result.version.split(",")[0]}`);

  // Check if tables exist
  const tables = await sql`
    SELECT table_name FROM information_schema.tables 
    WHERE table_schema = 'public' 
    ORDER BY table_name
  `;

  if (tables.length === 0) {
    console.log(
      "\n  No tables yet — they will be created on first server startup."
    );
  } else {
    console.log(`\n  Tables (${tables.length}):`);
    for (const t of tables) {
      console.log(`    - ${t.table_name}`);
    }
  }

  await sql.end();
  console.log("\nAll good! Your database is ready.");
} catch (err) {
  console.error("\nConnection FAILED:");
  console.error(`  ${err.message}`);
  console.error("\nPlease check your DATABASE_URL and try again.");
  process.exit(1);
}
