import { NextRequest, NextResponse } from 'next/server'
import { getMonthlyStats } from '@/accounting/api/server'
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
    return NextResponse.json(
      {
        data: [],
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch monthly statistics',
      },
      { status: 500 }
    )
  }
}
