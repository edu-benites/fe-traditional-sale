import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "";
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || "";

const isConfigured = Boolean(
  supabaseUrl &&
  supabaseAnonKey &&
  !supabaseUrl.includes("seu-projeto") &&
  !supabaseAnonKey.includes("sua-anon-key")
);

if (!isConfigured) {
  console.warn(
    "[Supabase] Credenciais não configuradas ou usando placeholder em .env. Para persistência remota em tempo real, configure VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY."
  );
}

// Inicializa o cliente do Supabase
export const supabase = isConfigured
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

export const isSupabaseConfigured = isConfigured;
