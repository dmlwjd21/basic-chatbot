import { createClient } from "@supabase/supabase-js";

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  "https://nnbzdhixxukqdmnakyzo.supabase.co";

const supabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5uYnpkaGl4eHVrcWRtbmFreXpvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODk4MDAyMzEsImV4cCI6MjEwNTM3NjIzMX0.Vi407aAusALIUNwG7clrb3_9l5UzpnWd-ZrMl2tUlRI";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
