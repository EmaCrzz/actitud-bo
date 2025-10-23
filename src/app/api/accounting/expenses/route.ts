import { NextRequest, NextResponse } from 'next/server'
import { getExpenses, createExpense } from '@/accounting/api/server'
import type { AccountingFilters, CreateExpenseData } from '@/accounting/types'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)

    const filters: AccountingFilters = {
      month: searchParams.get('month') || undefined,
      category: searchParams.get('category') || undefined,
    }

    const expenses = await getExpenses(filters)

    return NextResponse.json({
      data: expenses,
      success: true,
    })
  } catch (error) {
    return NextResponse.json(
      {
        data: [],
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch expenses',
      },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body: CreateExpenseData = await request.json()

    const expense = await createExpense(body)

    return NextResponse.json({
      data: expense,
      success: true,
    })
  } catch (error) {
    return NextResponse.json(
      {
        data: null,
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create expense',
      },
      { status: 500 }
    )
  }
}
