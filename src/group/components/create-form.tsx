'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { X } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

import { CustomerSearchInput } from '@/customer/components/customer-search-input'
import { createGroup } from '@/group/api/client'
import { Customer } from '@/customer/types'
import { CUSTOMER_LIST_GROUPS } from '@/consts/routes'
import { useTranslations } from '@/lib/i18n/context'
import { cn } from '@/lib/utils'
import { MembershipTranslation } from '@/membership/consts'

interface SelectedMember {
  id: string
  first_name: string
  last_name: string
  membership_type: string | null
}

export default function CreateGroupForm() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const { t } = useTranslations()
  const [name, setName] = useState('')
  const [members, setMembers] = useState<SelectedMember[]>([])
  const [submitting, setSubmitting] = useState(false)

  const selectedIds = useMemo(() => members.map((m) => m.id), [members])

  function addMember(customer: Customer) {
    setMembers((prev) => [
      ...prev,
      {
        id: customer.id,
        first_name: customer.first_name,
        last_name: customer.last_name,
        membership_type:
          (customer as unknown as { membership_type?: string | null }).membership_type ?? null,
      },
    ])
  }

  function removeMember(id: string) {
    setMembers((prev) => prev.filter((m) => m.id !== id))
  }

  const canSubmit = name.trim().length > 0 && members.length >= 2 && !submitting

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()

    if (!canSubmit) return

    setSubmitting(true)
    const res = await createGroup({
      name: name.trim(),
      customerIds: members.map((m) => m.id),
    })

    setSubmitting(false)

    if (!res.success) {
      toast.error(res.message)

      return
    }
    toast.success(res.message)
    // El listado de grupos usa React Query con cache — sin invalidar, el
    // grupo recién creado no aparece hasta un refresh manual.
    queryClient.invalidateQueries({ queryKey: ['groups', 'list'] })
    router.push(CUSTOMER_LIST_GROUPS)
  }

  const noMembersAdded = members.length === 0

  return (
    <>
      <form id='form-create-group' onSubmit={handleSubmit}>
        <section className='max-w-3xl mx-auto w-full px-4 overflow-auto pb-4 pt-8 grid gap-y-4'>
          <h3 className='text-sm sm:text-md mb-4'>{t('groups.createSubtitle')}</h3>

          <div className='grid gap-y-2'>
            <Label className='font-light' htmlFor='group_name'>
              {t('groups.nameLabel')}
            </Label>
            <Input
              className='py-2'
              disabled={submitting}
              id='group_name'
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div className='grid gap-y-2'>
            <Label className='font-light' htmlFor='member_search'>
              {t('groups.addMemberLabel')}
            </Label>
            <CustomerSearchInput
              disabled={submitting}
              excludeIds={selectedIds}
              id='member_search'
              renderItem={(c, { clear }) => (
                <li
                  key={c.id}
                  className='flex items-center justify-between gap-2 px-3 py-2 border-b border-input-border last:border-b-0 hover:bg-input-hover-background'
                >
                  <span className='text-sm capitalize'>
                    {c.first_name} {c.last_name}
                  </span>
                  <Button
                    className='shrink-0 py-1 px-2 font-poppins border-0 text-xs'
                    disabled={submitting}
                    size='sm'
                    type='button'
                    onClick={() => {
                      addMember(c)
                      clear()
                    }}
                  >
                    {t('groups.addMemberCta')}
                  </Button>
                </li>
              )}
            />
          </div>

          <div className='grid gap-y-2'>
            {!noMembersAdded && <div className='flex items-center justify-between'>
              <span className='text-sm font-semibold text-white'>{t('groups.membersAdded')}</span>
              <span className='text-xs text-primary'>
                {t('groups.membersAddedCount', { count: members.length })}
              </span>
            </div>}
            {noMembersAdded ? (
              <p className='text-base text-muted-foreground text-center py-6'>
                {t('groups.membersEmpty')}
              </p>
            ) : (
              <ul className='grid gap-y-2 rounded-lg border border-input-border bg-input-background p-2'>
                {members.map((m) => (
                  <li
                    key={m.id}
                    className='flex items-center justify-between px-2 py-2 border-b border-input-border last:border-b-0'
                  >
                    <div className='grid'>
                      <span className='text-sm font-medium text-white'>
                        {m.first_name} {m.last_name}
                      </span>
                      <span className='text-xs text-muted-foreground'>
                        {m.membership_type
                          ? t(
                              MembershipTranslation[
                                m.membership_type as keyof typeof MembershipTranslation
                              ]
                            )
                          : t('membership.noMembership')}
                      </span>
                    </div>
                    <Button
                      aria-label={t('common.remove')}
                      className='size-8 text-white/60 hover:text-destructive'
                      disabled={submitting}
                      size='icon'
                      type='button'
                      variant='ghost'
                      onClick={() => removeMember(m.id)}
                    >
                      <X className='size-4' />
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      </form>
      <footer className='flex flex-col max-w-3xl gap-3 mx-auto w-full px-4 pb-9'>
        <Button
          className={cn('w-full h-14', !canSubmit && 'opacity-60')}
          disabled={!canSubmit}
          form='form-create-group'
          loading={submitting}
          type='submit'
        >
          {t('groups.confirmCreate')}
        </Button>
      </footer>
    </>
  )
}
