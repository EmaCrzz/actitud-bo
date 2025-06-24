import { createClient } from "@/lib/supabase/client";
import { UserProfile } from "@/auth/types";

interface SignUp {
  email: string;
  password: string;

}

export async function signUp({ email, password }: SignUp) {
  const supabase = createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  
  if (error) {
    throw new Error(error.message)
  }

  return { success: true, message: "User signed up successfully" }
}

export async function signOut() {
  const supabase = createClient();
  const { error } = await supabase.auth.signOut()
  
  if (error) {
    throw new Error(error.message)
  }
}

// Actualizar perfil
export async function updateProfile(userId: string, updates: Partial<UserProfile>) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("profile")
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq("id", userId)
    .select()
    .single()

  if (error) {
    throw new Error(error.message)
  }

  return data
}

// Obtener usuario con perfil
export async function getUserWithProfile(userId: string) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("profile")
    .select(`
      *,
      users:auth.users(email)
    `)
    .eq("id", userId)
    .single()

  if (error) {
    throw new Error(error.message)
  }

  return data
}