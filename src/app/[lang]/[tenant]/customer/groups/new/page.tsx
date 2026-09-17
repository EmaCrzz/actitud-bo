import Link from 'next/link'
import ArrowLeftIcon from '@/components/icons/arrow-left'
import { Button } from '@/components/ui/button'
import { CUSTOMER_LIST_GROUPS } from '@/consts/routes'
import CreateGroupForm from '@/group/components/create-form'
import { getServerT } from '@/lib/i18n/server'

export default async function NewGroupPage() {
  const { t } = await getServerT()

  return (
    <>
      <header className='max-w-3xl mx-auto w-full px-4 py-3 flex justify-between items-center border-b border-primary pt-4'>
        <div className='flex gap-4 items-center'>
          <Button className='size-6 rounded-full' variant='ghost'>
            <Link href={CUSTOMER_LIST_GROUPS}>
              <ArrowLeftIcon className='size-6' />
            </Link>
          </Button>
          <h5 className='font-bold text-sm font-headline'>{t('groups.createTitle')}</h5>
        </div>
      </header>
      <CreateGroupForm />
    </>
  )
}
