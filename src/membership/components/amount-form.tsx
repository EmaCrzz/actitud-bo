'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Label } from '@/components/ui/label'
import { InputCurrency } from '@/components/ui/input-currency'
import { Button } from '@/components/ui/button'
import { useTranslations } from '@/lib/i18n/context'
import { MembershipType } from '../types'
import { updateMembershipPrices } from '../api/client'
import { formatDate } from '@/lib/format-date'
import { useRouter } from 'next/navigation'
import { ACCOUNTING, ACCOUNTING_TAB_MEMBERSHIP, STATS } from '@/consts/routes'
import { MEMBERSHIP_TYPE_DAILY } from '../consts'

export default function MembershipAmountForm({
  membership,
  onSuccess,
}: {
  membership: MembershipType
  onSuccess?: (updatedMembership: MembershipType) => void
}) {
  const [loading, setLoading] = useState(false)
  const { t } = useTranslations()
  const { replace } = useRouter()

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setLoading(true)

    try {
      const formData = new FormData(event.currentTarget)

      const prices = {
        amount: formData.get('base_amount') ? Number(formData.get('base_amount')) : undefined,
        middle_amount: formData.get('month_amount')
          ? Number(formData.get('month_amount'))
          : undefined,
        amount_surcharge: formData.get('amount_surcharge')
          ? Number(formData.get('amount_surcharge'))
          : undefined,
      }

      // Remove undefined values
      const cleanPrices = Object.fromEntries(
        Object.entries(prices).filter(([_, value]) => value !== undefined)
      ) as { amount?: number; middle_amount?: number; amount_surcharge?: number }

      const { data, error } = await updateMembershipPrices(membership.id, cleanPrices)

      if (error) {
        toast.error(t('errors.updatePrice'), {
          description: t('errors.updatePriceDescription'),
        })

        return
      }

      if (data) {
        toast.success(t('messages.successUpdatePrice'), {
          description: t('messages.successUpdatePriceDescription'),
        })
        onSuccess?.(data)
        replace(`${STATS}${ACCOUNTING}?tab=${ACCOUNTING_TAB_MEMBERSHIP}`)
      }
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Error updating prices:', error)
      toast.error(t('errors.updatePrice'), {
        description: t('errors.updatePriceDescription'),
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <form className='grow' id='form-amount-membership' onSubmit={handleSubmit}>
        <section className='max-w-3xl mx-auto w-full overflow-auto pb-4 grid gap-y-1'>
          <div className='grid gap-y-2 col-span-2'>
            <Label className='font-light' htmlFor='base_amount'>
              {t('common.basePrince')}
            </Label>
            <InputCurrency
              className='w-full font-light'
              defaultValue={membership.amount ? membership.amount.toString() : ''}
              id={'base_amount'}
              minValue={0}
              name={'base_amount'}
            />
          </div>
          {membership.type !== MEMBERSHIP_TYPE_DAILY && (
            <div className='grid gap-y-2 col-span-2'>
              <Label className='font-light' htmlFor='month_amount'>
                {t('common.middlePrice')}
              </Label>
              <InputCurrency
                className='w-full font-light'
                defaultValue={membership.middle_amount ? membership.middle_amount.toString() : ''}
                id={'month_amount'}
                minValue={0}
                name={'month_amount'}
              />
            </div>
          )}
          {membership.type !== MEMBERSHIP_TYPE_DAILY && (
            <div className='grid gap-y-2 col-span-2'>
              <Label className='font-light' htmlFor='amount_surcharge'>
                {t('common.surchargePrice')}
              </Label>
              <InputCurrency
                className='w-full font-light'
                defaultValue={
                  membership.amount_surcharge ? membership.amount_surcharge.toString() : ''
                }
                id={'amount_surcharge'}
                minValue={0}
                name={'amount_surcharge'}
              />
            </div>
          )}
        </section>
        <Label className='font-light block pb-4'>
          {t('common.lastUpdatedShort')}
          {': '}
          {membership.last_update ? formatDate(membership.last_update) : '-'}
        </Label>
      </form>
      <footer className='flex justify-between max-w-3xl gap-2 mx-auto w-full pb-9'>
        <Button
          className='w-full h-14'
          disabled={loading}
          form='form-amount-membership'
          type='submit'
        >
          {loading ? t('common.loading') : t('membership.confirm')}
        </Button>
      </footer>
    </>
  )
}
