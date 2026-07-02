import { NextRequest, NextResponse } from 'next/server'
import { updateMembershipPayment, deleteMembershipPayment } from '@/accounting/api/server'
import { accountingErrorResponse } from '@/accounting/api/http'
import type { UpdateMembershipPaymentData } from '@/accounting/types'

interface RouteParams {
  params: Promise<{ id: string }>
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    const body = await request.json()

    const updateData: UpdateMembershipPaymentData = {
      id,
      ...body,
    }

    const payment = await updateMembershipPayment(updateData)

    return NextResponse.json({
      data: payment,
      success: true,
    })
  } catch (error) {
    return accountingErrorResponse(error, 'Failed to update membership payment')
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params

    await deleteMembershipPayment(id)

    return NextResponse.json({
      success: true,
    })
  } catch (error) {
    return accountingErrorResponse(error, 'Failed to delete membership payment')
  }
}
