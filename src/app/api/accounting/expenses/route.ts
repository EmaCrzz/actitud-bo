import { NextRequest, NextResponse } from 'next/server'
import { getExpenses, createExpense } from '@/accounting/api/server'
import { accountingErrorResponse } from '@/accounting/api/http'
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
    return accountingErrorResponse(error, 'Failed to fetch expenses', [])
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
    return accountingErrorResponse(error, 'Failed to create expense')
  }
}
