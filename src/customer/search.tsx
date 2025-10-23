import SearchIcon from '@/components/icons/search'
import { Input } from '@/components/ui/input'
import { useTranslations } from '@/lib/i18n/context'

export default function Search() {
  const { t } = useTranslations()

  return (
    <Input
      autoComplete={'off'}
      className='py-2 pl-0 mt-6'
      componentLeft={<SearchIcon className='size-6' />}
      placeholder={t('customer.searchCustomers')}
      variant={'line'}
    />
  )
}
