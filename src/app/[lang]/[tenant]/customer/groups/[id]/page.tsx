import Link from 'next/link'
import ArrowLeftIcon from '@/components/icons/arrow-left'
import { Button } from '@/components/ui/button'
import { CUSTOMER_LIST_GROUPS } from '@/consts/routes'
import GroupDetail from '@/group/components/detail'
import api from '@/lib/i18n/api'
import { type Language } from '@/lib/i18n/types'
import { type TenantsType } from '@/lib/tenants'

// Whitelist estricta para el back: sólo paths internos bajo /customer.
// Bloquea open redirects (?from=https://evil.com), protocol-relative
// (?from=//evil.com) y destinos fuera del scope del feature.
function resolveBackHref(from: string | string[] | undefined): string {
  if (typeof from !== 'string') return CUSTOMER_LIST_GROUPS
  if (!from.startsWith('/customer')) return CUSTOMER_LIST_GROUPS
  if (from.startsWith('//')) return CUSTOMER_LIST_GROUPS

  return from
}

export default async function GroupDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ lang: Language; tenant: TenantsType; id: string }>
  searchParams: Promise<{ from?: string }>
}) {
  const { lang, tenant, id } = await params
  const { from } = await searchParams
  const { t } = await api.fetch(lang, tenant)
  const backHref = resolveBackHref(from)

  return (
    <>
      <header className='max-w-3xl mx-auto w-full px-4 py-3 flex justify-between items-center border-b border-primary pt-4'>
        <div className='flex gap-4 items-center'>
          <Button className='size-6 rounded-full' variant='ghost'>
            <Link href={backHref}>
              <ArrowLeftIcon className='size-6' />
            </Link>
          </Button>
          <h5 className='font-bold text-sm font-headline'>{t('groups.detailTitle')}</h5>
        </div>
      </header>
      <section className='max-w-3xl mx-auto w-full px-4 overflow-auto pb-9 pt-8'>
        <GroupDetail groupId={id} />
      </section>
    </>
  )
}
