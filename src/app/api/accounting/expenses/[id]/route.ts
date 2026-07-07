import { NextRequest, NextResponse } from 'next/server'
import { updateExpense, deleteExpense } from '@/accounting/api/server'
import { accountingErrorResponse } from '@/accounting/api/http'
import type { UpdateExpenseData } from '@/accounting/types'

interface RouteParams {
  params: Promise<{ id: string }>
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    const body = await request.json()

    const updateData: UpdateExpenseData = {
      id,
      ...body,
    }

    const expense = await updateExpense(updateData)

    return NextResponse.json({
      data: expense,
      success: true,
    })
  } catch (error) {
    return accountingErrorResponse(error, 'Failed to update expense')
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params

    await deleteExpense(id)

    return NextResponse.json({
      success: true,
    })
  } catch (error) {
    return accountingErrorResponse(error, 'Failed to delete expense')
  }
}
