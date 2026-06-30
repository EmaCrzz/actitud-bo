import AssistanceCounter, { AssistanceCounterLoader } from '@/assistance/counter'
import AutocompleteInput from '@/assistance/search'
import AuthHeader, { AuthHeaderLoader } from '@/auth/components/header'
import FooterNavigation from '@/components/nav'
import { Suspense } from 'react'
import { type Language } from '@/lib/i18n/types'
import { type TenantsType } from '@/lib/tenants'

export default async function Home({
  params,
}: {
  params: Promise<{ lang: Language; tenant: TenantsType }>
}) {
  const { lang, tenant } = await params

  return (
    <>
      <Suspense fallback={<AuthHeaderLoader />}>
        <AuthHeader lang={lang} tenant={tenant} />
      </Suspense>
      <section className='max-w-3xl mx-auto w-full'>
        <Suspense fallback={<AssistanceCounterLoader />}>
          <AssistanceCounter lang={lang} tenant={tenant} />
        </Suspense>
        <AutocompleteInput />
      </section>
      <FooterNavigation />
    </>
  )
}
