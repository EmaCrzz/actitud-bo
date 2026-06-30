import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { SUPABASE_ANON_KEY, SUPABASE_URL } from './envs'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// This check can be removed, it is just for tutorial purposes
export const hasEnvVars = SUPABASE_URL && SUPABASE_ANON_KEY
