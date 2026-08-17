import type { FeatureFlagName } from './consts'

export interface UserFeatureFlagRow {
  user_id: string
  flag_name: FeatureFlagName
  enabled: boolean
  updated_at: string
}
