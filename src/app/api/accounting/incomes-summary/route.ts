import { NextRequest, NextResponse } from 'next/server'
import { getIncomesSummary } from '@/accounting/api/incomes'
import { accountingErrorResponse } from '@/accounting/api/http'
import { getCurrentMonth } from '@/lib/format-date'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const month = searchParams.get('month') || getCurrentMonth()

    const summary = await getIncomesSummary(month)

    return NextResponse.json({
      data: summary,
      success: true,
    })
  } catch (error) {
    return accountingErrorResponse(error, 'Failed to fetch incomes summary', null)
  }
}
