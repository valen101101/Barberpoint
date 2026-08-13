import "server-only";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

// Ya no hay Supabase Auth para barberos (sesión propia, ver
// src/lib/session.ts) — el control de acceso vive en la app (proxy.ts +
// el layout), no en RLS por rol. Por eso el server habla con Supabase
// usando la service_role key, que bypassea RLS por diseño. Esta key es
// secreta: solo se usa acá (código de servidor), nunca llega al navegador.
export async function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error(
      "Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en las variables de entorno",
    );
  }

  return createSupabaseClient<Database>(url, serviceRoleKey, {
    auth: { persistSession: false },
  });
}
