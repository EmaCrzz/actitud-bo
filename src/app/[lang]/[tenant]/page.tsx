import AssistanceCounter, { AssistanceCounterLoader } from '@/assistance/counter'
import AutocompleteInput from '@/assistance/search'
import AuthHeader, { AuthHeaderLoader } from '@/auth/components/header'
import FooterNavigation from '@/components/nav'
import { Suspense } from 'react'

export default async function Home() {
  return (
    <>
      <Suspense fallback={<AuthHeaderLoader />}>
        <AuthHeader />
      </Suspense>
      <section className='max-w-3xl mx-auto w-full'>
        <Suspense fallback={<AssistanceCounterLoader />}>
          <AssistanceCounter />
        </Suspense>
        <AutocompleteInput />
      </section>
      <FooterNavigation />
    </>
  )
}
