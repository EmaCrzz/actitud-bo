'use client'

import Link from 'next/link'
import { AlertCircleIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { STATS } from '@/consts/routes'
import { useRouter } from 'next/navigation'
import { useTranslations } from '@/lib/i18n/context'
import ArrowLeftIcon from '@/components/icons/arrow-left'

export default function EditMembershipErrorPage({ error }: { error: Error & { digest?: string } }) {
  const { t } = useTranslations()
  const { back } = useRouter()

  return (
    <>
      <header className='max-w-3xl mx-auto w-full px-4 py-3 flex justify-between items-center border-b border-primary pt-4'>
        <div className='flex gap-4 items-center'>
          <Button className='size-6 rounded-full' variant='ghost'>
            <Link href={STATS}>
              <ArrowLeftIcon className='size-6' />
            </Link>
          </Button>
          <h5 className='font-bold text-sm font-headline'>
            {t('accounting.accountingAndFinance.title')}
          </h5>
        </div>
      </header>
      <section className='max-w-3xl mx-auto w-full px-4 py-3 flex flex-col pt-12'>
        <AlertCircleIcon className='size-24 text-red-400 mb-4 mx-auto' />
        <span className='mb-4 mx-auto'>{error.message}</span>
        <Button className='mx-auto' variant='link' onClick={back}>
          {t('buttons.back')}
        </Button>
      </section>
    </>
  )
}
