import { NextRequest, NextResponse } from 'next/server'
import { getPendingCustomers } from '@/accounting/api/incomes'
import { accountingErrorResponse } from '@/accounting/api/http'
import { getCurrentMonth } from '@/lib/format-date'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const month = searchParams.get('month') || getCurrentMonth()

    const data = await getPendingCustomers(month)

    return NextResponse.json({ data, success: true })
  } catch (error) {
    return accountingErrorResponse(error, 'Failed to fetch pending customers', null)
  }
}
