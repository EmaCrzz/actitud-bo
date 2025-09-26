'use client'

import { Button } from '@/components/ui/button'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useMonth } from '@/membership/context/month-context'

const months = [
  'Enero',
  'Febrero',
  'Marzo',
  'Abril',
  'Mayo',
  'Junio',
  'Julio',
  'Agosto',
  'Septiembre',
  'Octubre',
  'Noviembre',
  'Diciembre',
]

export default function MembershipMonthSelector() {
  const { year, month, isCurrentMonth } = useMonth()

  return (
    <div className='flex items-center justify-between bg-transparent py-4'>
      <Button
        disabled
        className='text-white hover:bg-gray-800'
        size='icon'
        variant='ghost'
        // onClick={goToPreviousMonth}
      >
        <ChevronLeft className='w-6 h-6' />
      </Button>

      <div className='text-center'>
        <h2 className='text-white text-xl font-semibold'>
          {months[month - 1]} {year}
        </h2>
        {isCurrentMonth && <p className='text-gray-400 text-sm'>Mes actual</p>}
      </div>

      <Button
        disabled
        className='text-white hover:bg-gray-800'
        size='icon'
        variant='ghost'
        // onClick={goToNextMonth}
      >
        <ChevronRight className='w-6 h-6' />
      </Button>
    </div>
  )
}
