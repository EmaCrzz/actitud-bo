import { redirect } from 'next/navigation'
import { hasFeatureFlag } from '@/feature-flags/api/server'
import { FEATURE_FLAGS } from '@/feature-flags/consts'
import { HOME } from '@/consts/routes'

export default async function V2Layout({ children }: { children: React.ReactNode }) {
  const canAccessV2 = await hasFeatureFlag(FEATURE_FLAGS.V2_ACCESS)

  if (!canAccessV2) {
    redirect(HOME)
  }

  return <>{children}</>
}
