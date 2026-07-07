import { NextRequest, NextResponse } from 'next/server'
import { getMembershipPayments, createMembershipPayment } from '@/accounting/api/server'
import { accountingErrorResponse } from '@/accounting/api/http'
import type { AccountingFilters, CreateMembershipPaymentData } from '@/accounting/types'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)

    const filters: AccountingFilters = {
      month: searchParams.get('month') || undefined,
      customer_id: searchParams.get('customer_id') || undefined,
      payment_method: searchParams.get('payment_method') || undefined,
    }

    const payments = await getMembershipPayments(filters)

    return NextResponse.json({
      data: payments,
      success: true,
    })
  } catch (error) {
    return accountingErrorResponse(error, 'Failed to fetch membership payments', [])
  }
}

export async function POST(request: NextRequest) {
  try {
    const body: CreateMembershipPaymentData = await request.json()

    const payment = await createMembershipPayment(body)

    return NextResponse.json({
      data: payment,
      success: true,
    })
  } catch (error) {
    return accountingErrorResponse(error, 'Failed to create membership payment')
  }
}
