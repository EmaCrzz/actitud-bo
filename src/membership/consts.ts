export const MEMBERSHIP_TYPE_5_DAYS = "MEMBERSHIP_TYPE_5_DAYS" as const;
export const MEMBERSHIP_TYPE_3_DAYS = "MEMBERSHIP_TYPE_3_DAYS" as const;
export const MEMBERSHIP_TYPE_DAILY = "MEMBERSHIP_TYPE_DAILY" as const;
export type MembershipType = typeof MEMBERSHIP_TYPE_5_DAYS | typeof MEMBERSHIP_TYPE_3_DAYS | typeof MEMBERSHIP_TYPE_DAILY;
export const MembershipTranslation = {
  [MEMBERSHIP_TYPE_5_DAYS]: "Membresía: 5 días",
  [MEMBERSHIP_TYPE_3_DAYS]: "Membresía: 3 días",
  [MEMBERSHIP_TYPE_DAILY]: "Pase diario",
}

export const MembershipTranslationTwoLines = {
  [MEMBERSHIP_TYPE_5_DAYS]: { one: "5", two: "Días de la semana" },
  [MEMBERSHIP_TYPE_3_DAYS]: { one: "3", two: "Días de la semana" },
  [MEMBERSHIP_TYPE_DAILY]: { one: "1", two: "Pase diario" },
}
