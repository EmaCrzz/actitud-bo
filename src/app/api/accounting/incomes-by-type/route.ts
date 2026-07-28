import { NextRequest, NextResponse } from 'next/server'
import { getPaymentsByType } from '@/accounting/api/incomes'
import { accountingErrorResponse } from '@/accounting/api/http'
import { getCurrentMonth } from '@/lib/format-date'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const month = searchParams.get('month') || getCurrentMonth()
    const type = searchParams.get('type')

    if (!type) {
      return NextResponse.json(
        { data: null, success: false, error: 'Missing required query param: type' },
        { status: 400 }
      )
    }

    const data = await getPaymentsByType(month, type)

    return NextResponse.json({ data, success: true })
  } catch (error) {
    return accountingErrorResponse(error, 'Failed to fetch payments by type', null)
  }
}
