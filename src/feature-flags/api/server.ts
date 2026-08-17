import { cache } from 'react'
import { createClient } from '@/lib/supabase/server'
import type { FeatureFlagName } from '@/feature-flags/consts'

export const getCurrentUserFeatureFlags = cache(async (): Promise<FeatureFlagName[]> => {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return []

  const { data: profile } = await supabase
    .from('profile')
    .select('id')
    .eq('auth_id', user.id)
    .single()

  if (!profile) return []

  const { data: flags } = await supabase
    .from('user_feature_flags')
    .select('flag_name')
    .eq('user_id', profile.id)
    .eq('enabled', true)

  return (flags ?? []).map((f) => f.flag_name as FeatureFlagName)
})

export async function hasFeatureFlag(name: FeatureFlagName): Promise<boolean> {
  const flags = await getCurrentUserFeatureFlags()

  return flags.includes(name)
}
