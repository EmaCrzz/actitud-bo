import AssistancesList, { AssistancesListSkeleton } from '@/assistance/assistances-list'
import DayNavigator from '@/assistance/day-navigator'
import FooterNavigation from '@/components/nav'
import { Button } from '@/components/ui/button'
import { ASSISTANCES, HOME } from '@/consts/routes'
import { ArrowLeftIcon } from 'lucide-react'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Suspense } from 'react'
import api from '@/lib/i18n/api'
import { type Language } from '@/lib/i18n/types'
import { type TenantsType } from '@/lib/tenants'
import { getTodayIsoDateInAppTz, shiftIsoDateInAppTz } from '@/lib/timezone'

// Ventana máxima hacia atrás desde /assistances.
const MAX_DAYS_BACK = 14

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/

function resolveSelectedDate(raw: string | undefined, todayIso: string): string {
  if (!raw) return todayIso
  if (!ISO_DATE_RE.test(raw)) notFound()

  // Validar que el string se corresponda a un día real (evita "2026-02-31").
  const [y, m, d] = raw.split('-').map(Number)
  const asDate = new Date(Date.UTC(y, m - 1, d))
  const normalized =
    asDate.getUTCFullYear() === y && asDate.getUTCMonth() === m - 1 && asDate.getUTCDate() === d

  if (!normalized) notFound()

  const minIso = shiftIsoDateInAppTz(todayIso, -MAX_DAYS_BACK)

  if (raw > todayIso) notFound()
  if (raw < minIso) notFound()

  return raw
}

export default async function page({
  params,
  searchParams,
}: {
  params: Promise<{ lang: Language; tenant: TenantsType }>
  searchParams: Promise<{ date?: string }>
}) {
  const { lang, tenant } = await params
  const { date: rawDate } = await searchParams
  const { t } = await api.fetch(lang, tenant)

  const todayIso = getTodayIsoDateInAppTz()
  const selectedDate = resolveSelectedDate(rawDate, todayIso)
  const minIso = shiftIsoDateInAppTz(todayIso, -MAX_DAYS_BACK)
  const listDateProp = selectedDate === todayIso ? undefined : selectedDate

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
          <AssistancesList collapsible={false} date={listDateProp} lang={lang} tenant={tenant} />
        </Suspense>
      </section>
      <FooterNavigation />
    </>
  )
}
