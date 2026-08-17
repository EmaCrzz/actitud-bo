export const FEATURE_FLAGS = {
  V2_ACCESS: 'v2_access',
} as const

export type FeatureFlagName = (typeof FEATURE_FLAGS)[keyof typeof FEATURE_FLAGS]
