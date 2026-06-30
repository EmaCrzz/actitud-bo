import { TranslationKey } from '@/lib/i18n/types'

export const MEMBERSHIP_TYPE_5_DAYS = 'MEMBERSHIP_TYPE_5_DAYS' as const
export const MEMBERSHIP_TYPE_3_DAYS = 'MEMBERSHIP_TYPE_3_DAYS' as const
export const MEMBERSHIP_TYPE_DAILY = 'MEMBERSHIP_TYPE_DAILY' as const
export const MEMBERSHIP_TYPE_VIP = 'MEMBERSHIP_TYPE_VIP' as const
export const PENDING_PAYMENT = 'PENDING_PAYMENT' as const
export const MembershipTypeArray = [
  MEMBERSHIP_TYPE_5_DAYS,
  MEMBERSHIP_TYPE_3_DAYS,
  MEMBERSHIP_TYPE_DAILY,
  MEMBERSHIP_TYPE_VIP,
]
export type MembershipTypes =
  | typeof MEMBERSHIP_TYPE_5_DAYS
  | typeof MEMBERSHIP_TYPE_3_DAYS
  | typeof MEMBERSHIP_TYPE_DAILY
  | typeof MEMBERSHIP_TYPE_VIP

export const MembershipTranslation: Record<MembershipTypes, TranslationKey> = {
  [MEMBERSHIP_TYPE_5_DAYS]: 'membership.types.5_days',
  [MEMBERSHIP_TYPE_3_DAYS]: 'membership.types.3_days',
  [MEMBERSHIP_TYPE_DAILY]: 'membership.types.daily',
  [MEMBERSHIP_TYPE_VIP]: 'membership.types.vip',
}

export const MembershipTranslationTwoLines: Record<
  MembershipTypes,
  Record<string, TranslationKey>
> = {
  [MEMBERSHIP_TYPE_5_DAYS]: {
    one: 'membership.types.twoLines.3_days.line1',
    two: 'membership.types.twoLines.3_days.line2',
  },
  [MEMBERSHIP_TYPE_3_DAYS]: {
    one: 'membership.types.twoLines.3_days.line1',
    two: 'membership.types.twoLines.3_days.line2',
  },
  [MEMBERSHIP_TYPE_DAILY]: {
    one: 'membership.types.twoLines.daily.line1',
    two: 'membership.types.twoLines.daily.line2',
  },
  [MEMBERSHIP_TYPE_VIP]: {
    one: 'membership.types.twoLines.vip.line1',
    two: 'membership.types.twoLines.vip.line2',
  },
}

export const PAYMENT_CHASH = 'PAYMENT_CHASH' as const
export const PAYMENT_TRANSFER = 'PAYMENT_TRANSFER' as const

export const PaymentTypeArray = [PAYMENT_CHASH, PAYMENT_TRANSFER]

export type PaymentType = typeof PAYMENT_CHASH | typeof PAYMENT_TRANSFER

export const PaymentsTranslation: Record<PaymentType, TranslationKey> = {
  [PAYMENT_CHASH]: 'payments.cash',
  [PAYMENT_TRANSFER]: 'payments.transfer',
}
