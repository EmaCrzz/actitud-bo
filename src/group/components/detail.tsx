'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { MoreVertical, Trash2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'

import { CustomerSearchInput } from '@/customer/components/customer-search-input'
import {
  addMember,
  deleteGroup,
  getGroupWithMembers,
  removeMember,
  renameGroup,
} from '@/group/api/client'
import { Customer } from '@/customer/types'
import { CUSTOMER, CUSTOMER_LIST_GROUPS } from '@/consts/routes'
import { useTranslations } from '@/lib/i18n/context'
import { MembershipTranslation } from '@/membership/consts'

interface Props {
  groupId: string
}

export default function GroupDetail({ groupId }: Props) {
  const router = useRouter()
  const queryClient = useQueryClient()
  const { t } = useTranslations()

  const { data, isLoading, isError } = useQuery({
    queryKey: ['groups', 'detail', groupId],
    queryFn: () => getGroupWithMembers(groupId),
  })

  const [name, setName] = useState('')
  const [savingName, setSavingName] = useState(false)
  const [confirmDeleteGroup, setConfirmDeleteGroup] = useState(false)
  const [pendingRemoveMember, setPendingRemoveMember] = useState<{
    memberId: string
    name: string
  } | null>(null)

  useEffect(() => {
    if (data) setName(data.name)
  }, [data])

  const selectedIds = useMemo(
    () => (data?.members ?? []).map((m) => m.customer_id),
    [data?.members]
  )

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: ['groups', 'detail', groupId] })
    queryClient.invalidateQueries({ queryKey: ['groups', 'list'] })
  }

  async function handleSaveName() {
    if (!data || name.trim() === data.name.trim() || !name.trim()) return
    setSavingName(true)
    const res = await renameGroup(groupId, name.trim())

    setSavingName(false)
    if (!res.success) {
      toast.error(res.message)

      return
    }
    toast.success(res.message)
    invalidate()
  }

  async function handleAddMember(customer: Customer) {
    const res = await addMember(groupId, customer.id)

    if (!res.success) {
      toast.error(res.message)

      return
    }
    toast.success(res.message)
    invalidate()
  }

  async function handleRemoveMember(memberId: string) {
    const res = await removeMember(memberId)

    if (!res.success) {
      toast.error(res.message)

      return
    }
    toast.success(res.message)
    invalidate()
  }

  async function handleDeleteGroup() {
    const res = await deleteGroup(groupId)

    if (!res.success) {
      toast.error(res.message)

      return
    }
    toast.success(res.message)
    queryClient.removeQueries({ queryKey: ['groups', 'detail', groupId] })
    await queryClient.invalidateQueries({ queryKey: ['groups', 'list'] })
    router.push(CUSTOMER_LIST_GROUPS)
  }

  if (isLoading) {
    return (
      <div className='grid gap-y-4'>
        <Skeleton className='h-12 w-full' />
        <Skeleton className='h-6 w-1/3' />
        <Skeleton className='h-40 w-full rounded-lg' />
      </div>
    )
  }

  if (isError || !data) {
    return (
      <div className='mt-10 text-center text-sm text-destructive'>{t('groups.detailError')}</div>
    )
  }

  return (
    <div className='flex flex-col gap-y-6 min-h-[calc(100dvh-10rem)]'>
      <div className='grid gap-y-2'>
        <Label className='font-light' htmlFor='group_name'>
          {t('groups.nameLabel')}
        </Label>
        <Input
          className='py-2'
          disabled={savingName}
          id='group_name'
          value={name}
          onBlur={handleSaveName}
          onChange={(e) => setName(e.target.value)}
        />
      </div>

      <div className='grid gap-y-2'>
        <div className='flex items-center justify-between'>
          <span className='text-sm font-semibold text-white'>{t('groups.membersAdded')}</span>
          <span className='text-xs text-primary'>
            {t('groups.membersCount', { count: data.members.length })}
          </span>
        </div>

        <CustomerSearchInput
          excludeIds={selectedIds}
          id='member_search'
          placeholder={t('groups.addMemberLabel')}
          renderItem={(c, { clear }) => (
            <li
              key={c.id}
              className='flex items-center justify-between gap-2 px-3 py-2 border-b border-input-border last:border-b-0 hover:bg-input-hover-background'
            >
              <span className='text-sm capitalize'>
                {c.first_name} {c.last_name}
              </span>
              <Button
                className='h-8 px-4 shrink-0'
                size='sm'
                type='button'
                onClick={() => {
                  clear()
                  handleAddMember(c)
                }}
              >
                {t('groups.addMemberCta')}
              </Button>
            </li>
          )}
        />

        <ul className='grid gap-y-2 rounded-lg border border-input-border bg-input-background p-2'>
          {data.members.length === 0 ? (
            <li className='text-xs text-muted-foreground text-center py-4'>
              {t('groups.membersEmpty')}
            </li>
          ) : (
            data.members.map((m) => (
              <li
                key={m.member_id}
                className='flex items-center justify-between px-2 py-2 border-b border-input-border last:border-b-0'
              >
                <div className='grid'>
                  <span className='text-sm font-medium text-white'>
                    {m.first_name} {m.last_name}
                  </span>
                  <div className='flex items-center gap-2 mt-1'>
                    {m.membership_type ? (
                      <span className='text-xs text-white/70'>
                        {t(
                          MembershipTranslation[
                            m.membership_type as keyof typeof MembershipTranslation
                          ]
                        )}
                      </span>
                    ) : (
                      <span className='text-xs text-white/70'>{t('membership.noMembership')}</span>
                    )}
                    {m.membership_type &&
                      (m.is_expired ? (
                        <Badge className='bg-destructive text-white text-[10px] px-2'>
                          {t('groups.statusExpired')}
                        </Badge>
                      ) : (
                        <Badge className='bg-success text-white text-[10px] px-2'>
                          {t('groups.statusActive')}
                        </Badge>
                      ))}
                  </div>
                </div>
                <DropdownMenu modal={false}>
                  <DropdownMenuTrigger
                    aria-label={t('common.moreActions')}
                    className='flex items-center justify-center size-8 shrink-0 rounded-full text-white/70 outline-none transition-colors hover:bg-white/10 hover:text-white'
                  >
                    <MoreVertical className='size-5' />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align='end'>
                    <DropdownMenuItem onSelect={() => router.push(`${CUSTOMER}/${m.customer_id}`)}>
                      {t('groups.goToProfile')}
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onSelect={() =>
                        setPendingRemoveMember({
                          memberId: m.member_id,
                          name: `${m.first_name} ${m.last_name}`,
                        })
                      }
                    >
                      {t('groups.removeFromGroup')}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </li>
            ))
          )}
        </ul>
      </div>

      <Button
        className='mt-auto flex items-center font-poppins justify-center gap-2 leading-0 text-destructive'
        type='button'
        variant='link'
        onClick={() => setConfirmDeleteGroup(true)}
      >
        <Trash2 className='size-5' />
        {t('groups.deleteGroup')}
      </Button>

      <AlertDialog
        open={!!pendingRemoveMember}
        onOpenChange={(open) => !open && setPendingRemoveMember(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('groups.confirmRemoveTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('groups.confirmRemoveDesc', { name: pendingRemoveMember?.name ?? '' })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (pendingRemoveMember) {
                  handleRemoveMember(pendingRemoveMember.memberId)
                  setPendingRemoveMember(null)
                }
              }}
            >
              {t('common.confirm')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={confirmDeleteGroup} onOpenChange={setConfirmDeleteGroup}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('groups.confirmDeleteGroupTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('groups.confirmDeleteGroupDesc', { name: data.name })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                handleDeleteGroup()
                setConfirmDeleteGroup(false)
              }}
            >
              {t('common.confirm')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
