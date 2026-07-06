import PencilIcon from '@/components/icons/pencil'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { CUSTOMER_EDIT } from '@/consts/routes'
import { CustomerComplete } from '@/customer/types'
import { formatPersonId } from '@/lib/format-person-id'
import { formatPhone } from '@/lib/format-phone'
import { formatDate } from '@/lib/format-date'
import { PaymentsTranslation, type PaymentType } from '@/membership/consts'
import Link from 'next/link'
import { type Language } from '@/lib/i18n/types'
import { type TenantsType } from '@/lib/tenants'
import api from '@/lib/i18n/api'

export default async function InfoResume({
  customer,
  lang,
  tenant,
}: {
  customer: CustomerComplete
  lang: Language
  tenant: TenantsType
}) {
  const { t } = await api.fetch(lang, tenant)

  const lastPaymentDate = customer.customer_membership?.last_payment_date
  const paymentTranslationKey = customer.last_payment_method
    ? PaymentsTranslation[customer.last_payment_method as PaymentType]
    : null
  const paymentMethodLabel = paymentTranslationKey
    ? t(paymentTranslationKey)
    : (customer.last_payment_method ?? '-')

  return (
    <section>
      <section className='p-4 grid gap-y-8 bg-input-background rounded-[4px] border-[0.5px] border-input-border'>
        <div className='flex justify-between border-b pb-[0.5] border-primary400'>
          <Label className='text-xl leading-6 text-primary400'>
            {t('membership.personalData')}
          </Label>
          <Button size={'icon'} variant='icon'>
            <Link href={`${CUSTOMER_EDIT}/${customer.id}`}>
              <PencilIcon className='size-6' />
            </Link>
          </Button>
        </div>
        <div className='grid gap-y-2'>
          <Label className='font-light text-xs leading-6'>{t('membership.fullName')}</Label>
          <span className='font-medium leading-6'>
            {customer.first_name} {customer.last_name}
          </span>
        </div>
        <div className='grid gap-y-2'>
          <Label className='font-light text-xs leading-6'>{t('membership.idNumber')}</Label>
          <span className='font-medium leading-6'>{formatPersonId(customer.person_id)}</span>
        </div>
        <div className='grid gap-y-2'>
          <Label className='font-light text-xs leading-6'>{t('membership.phoneContact')}</Label>
          <span className='font-medium leading-6'>
            {customer.phone ? formatPhone(customer.phone) : '-'}
          </span>
        </div>
        <div className='grid gap-y-2'>
          <Label className='font-light text-xs leading-6'>{t('membership.paymentMethod')}</Label>
          <span className='font-medium leading-6'>{paymentMethodLabel}</span>
        </div>
        <div className='grid gap-y-2'>
          <Label className='font-light text-xs leading-6'>
            {t('membership.lastPaymentRegistered')}
          </Label>
          <span className='font-medium leading-6'>
            {lastPaymentDate ? formatDate(lastPaymentDate) : '-'}
          </span>
        </div>
      </section>
    </section>
  )
}
