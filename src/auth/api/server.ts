import { createClient } from "@/lib/supabase/server";
import { Profile } from "@/auth/types";

// Obtener perfil del usuario
export async function getProfile(userId?: string): Promise<Profile | null> {
  if(!userId) return null
  const supabase = await createClient();
  const { data, error } = await supabase.from("profile").select("*").eq("id", userId).single()

  if (error) {
    console.error("Error fetching profile:", error)
    return null
  }

  return data
}