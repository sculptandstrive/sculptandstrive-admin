import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

function cleanEnvVar(val: string | undefined): string | undefined {
  if (!val) return undefined;
  let cleaned = String(val).trim();
  cleaned = cleaned.replace(/%(0a|0d|20)/gi, '');
  try {
    cleaned = decodeURIComponent(cleaned);
  } catch (e) {
    // ignore
  }
  return cleaned
    .replace(/%(0a|0d|20)/gi, '')
    .replace(/[\r\n\t\s\u200B-\u200D\uFEFF]/g, '')
    .trim();
}

const rawUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const rawKey = (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY) as string | undefined;

const SUPABASE_URL = cleanEnvVar(rawUrl) || "";
const SUPABASE_PUBLISHABLE_KEY = cleanEnvVar(rawKey) || "";

if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
  console.warn("Supabase environment variables (VITE_SUPABASE_URL, VITE_SUPABASE_PUBLISHABLE_KEY) are not set in .env.");
}

export const supabase = createClient<Database>(
  SUPABASE_URL,
  SUPABASE_PUBLISHABLE_KEY,
  {
    auth: {
      storage: localStorage,
      persistSession: true,
      autoRefreshToken: true,
    }
  }
);