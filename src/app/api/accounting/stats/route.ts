import { NextRequest, NextResponse } from 'next/server'
import { getMonthlyStats } from '@/accounting/api/server'
import { accountingErrorResponse } from '@/accounting/api/http'
import { getCurrentMonth } from '@/lib/format-date'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    // Fallback to current month if no month is provided
    const month = searchParams.get('month') || getCurrentMonth()

    const stats = await getMonthlyStats(month)

    return NextResponse.json({
      data: stats,
      success: true,
    })
  } catch (error) {
    return accountingErrorResponse(error, 'Failed to fetch monthly statistics', [])
  }
}
