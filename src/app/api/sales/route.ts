import { NextRequest, NextResponse } from 'next/server'
import { accountingErrorResponse } from '@/accounting/api/http'
import { createSale, SaleValidationError } from '@/sales/api/server'
import type { SaleInput } from '@/sales/types'

export async function POST(request: NextRequest) {
  try {
    const body: SaleInput = await request.json()
    const sale = await createSale(body)

    return NextResponse.json({ data: sale, success: true })
  } catch (error) {
    if (error instanceof SaleValidationError) {
      return NextResponse.json({ data: null, success: false, error: error.message }, { status: 400 })
    }

    return accountingErrorResponse(error, 'Failed to create sale')
  }
}
