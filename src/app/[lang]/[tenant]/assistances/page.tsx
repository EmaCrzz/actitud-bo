import AssistancesList, { AssistancesListSkeleton } from '@/assistance/assistances-list'
import DayNavigator from '@/assistance/day-navigator'
import FooterNavigation from '@/components/nav'
import { Button } from '@/components/ui/button'
import { ASSISTANCES, HOME } from '@/consts/routes'
import { ArrowLeftIcon } from 'lucide-react'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Suspense } from 'react'
import { getServerT } from '@/lib/i18n/server'
import { getTodayIsoDateInAppTz } from '@/lib/timezone'
import { getMinAssistanceDate, resolveAssistanceDate } from '@/assistance/date-range'

export default async function page({ searchParams }: { searchParams: Promise<{ date?: string }> }) {
  const { date: rawDate } = await searchParams
  // `lang` se sigue usando acá: DayNavigator es client y lo necesita para Intl.
  const { t, lang } = await getServerT()

  // La resolución del `?date=` vive en `assistance/date-range` porque la
  // comparte con la sección de v2. Acá `?date=` apuntando a hoy se trata como
  // hoy (sin redirect), que es el comportamiento que esta pantalla ya tenía.
  const todayIso = getTodayIsoDateInAppTz()
  const resolution = resolveAssistanceDate(rawDate, todayIso)

  if (resolution.status === 'invalid') notFound()

  const selectedDate = resolution.status === 'day' ? resolution.date : todayIso
  const minIso = getMinAssistanceDate(todayIso)
  const listDateProp = resolution.status === 'day' ? resolution.date : undefined

  return (
    <>
      <header className='max-w-3xl mx-auto w-full px-4 py-3 flex justify-between items-center border-b border-primary pt-4'>
        <div className='flex gap-4 items-center'>
          <Button className='size-6 rounded-full' variant='ghost'>
            <Link href={HOME}>
              <ArrowLeftIcon className='size-6' />
            </Link>
          </Button>
          <h5 className='font-bold text-sm font-headline'>{t('assistance.titlePlural')}</h5>
        </div>
      </header>
      <section className='max-w-3xl mx-auto w-full px-4 overflow-auto py-4 space-y-2'>
        <DayNavigator
          basePath={ASSISTANCES}
          currentDate={selectedDate}
          lang={lang}
          minDate={minIso}
          todayDate={todayIso}
        />
        <Suspense
          key={selectedDate}
          fallback={
            <AssistancesListSkeleton
              collapsible={false}
              todayAssistancesText={t('assistance.todayAssistances')}
            />
          }
        >
          <AssistancesList collapsible={false} date={listDateProp} />
        </Suspense>
      </section>
      <FooterNavigation />
    </>
  )
}
