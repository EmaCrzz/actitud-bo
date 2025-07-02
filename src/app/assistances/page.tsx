import AssistancesList, { AssistancesListSkeleton } from '@/assistance/assistances-list'
import FooterNavigation from '@/components/nav'
import { Button } from '@/components/ui/button'
import { HOME } from '@/consts/routes'
import { ArrowLeftIcon } from 'lucide-react'
import Link from 'next/link'
import { Suspense } from 'react'

export default async function page() {
  return (
    <>
      <header className='max-w-3xl mx-auto w-full px-2 sm:px-4 py-3 flex justify-between items-center border-b border-primary pt-4'>
        <div className='flex gap-4 items-center'>
          <Button className='size-6 rounded-full' size='icon' variant='ghost'>
            <Link href={HOME}>
              <ArrowLeftIcon className='size-6' />
            </Link>
          </Button>
          <h5 className='font-medium text-sm'>Asistencias del dia</h5>
        </div>
      </header>
      <section className='max-w-3xl mx-auto w-full px-2 sm:px-4 overflow-auto py-4'>
        <Suspense fallback={<AssistancesListSkeleton collapsible={false} />}>
          <AssistancesList collapsible={false} />
        </Suspense>
      </section>
      <FooterNavigation />
    </>
  )
}
