import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

type CheckStatus = 'ok' | 'fail'

async function checkDatabase(): Promise<CheckStatus> {
  try {
    const supabase = await createClient()
    const { error } = await supabase.from('customers').select('id').limit(1)

    return error ? 'fail' : 'ok'
  } catch {
    return 'fail'
  }
}

export async function GET() {
  const startedAt = Date.now()
  const checks = {
    db: await checkDatabase(),
  }
  const ok = Object.values(checks).every((status) => status === 'ok')

  return NextResponse.json(
    {
      ok,
      checks,
      ts: new Date().toISOString(),
      latencyMs: Date.now() - startedAt,
    },
    { status: ok ? 200 : 503 }
  )
}
