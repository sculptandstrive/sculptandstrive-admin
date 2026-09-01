import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const migrationPath = path.join(__dirname, '../supabase/migrations/20260901000000_create_tutorial_playlists.sql');

if (!fs.existsSync(migrationPath)) {
  console.error("Migration file not found:", migrationPath);
  process.exit(1);
}

const sql = fs.readFileSync(migrationPath, 'utf8');

console.log("=================================================");
console.log("SQL MIGRATION SCRIPT FOR TUTORIAL PLAYLISTS");
console.log("=================================================");
console.log("Copy and execute the following SQL in your Supabase SQL Editor:\n");
console.log(sql);
console.log("\n=================================================");
