import { NextRequest, NextResponse } from 'next/server'
import { accountingErrorResponse } from '@/accounting/api/http'
import { deleteSale, SaleValidationError, updateSale } from '@/sales/api/server'
import type { SaleInput } from '@/sales/types'

interface RouteParams {
  params: Promise<{ id: string }>
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    const body: SaleInput = await request.json()
    const sale = await updateSale(id, body)

    return NextResponse.json({ data: sale, success: true })
  } catch (error) {
    if (error instanceof SaleValidationError) {
      return NextResponse.json({ data: null, success: false, error: error.message }, { status: 400 })
    }

    return accountingErrorResponse(error, 'Failed to update sale')
  }
}

export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params

    await deleteSale(id)

    return NextResponse.json({ success: true })
  } catch (error) {
    return accountingErrorResponse(error, 'Failed to delete sale')
  }
}
