import { NextRequest, NextResponse } from 'next/server'
import { updateMembershipPayment, deleteMembershipPayment } from '@/accounting/api/server'
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
    return NextResponse.json(
      {
        data: null,
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update membership payment',
      },
      { status: 500 }
    )
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
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete membership payment',
      },
      { status: 500 }
    )
  }
}
