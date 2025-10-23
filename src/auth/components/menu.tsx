'use client'

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { signOut } from '@/auth/api/client'
import { useRouter } from 'next/navigation'
import { useVersion } from '@/lib/version'
import { useTranslations } from '@/lib/i18n/context'

interface Props {
  children: React.ReactNode
}

export default function MenuAuth({ children }: Props) {
  const router = useRouter()
  const versionInfo = useVersion()
  const { t } = useTranslations()

  const handleLogout = () => {
    signOut()
    router.refresh()
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>{children}</DropdownMenuTrigger>
      <DropdownMenuContent align='end' className='w-56'>
        {/* Version info - not clickable */}
        <div className='px-2 py-1.5 text-xs text-muted-foreground border-b'>
          <div className='flex items-center justify-between'>
            <span>{t('common.version')}</span>
            <span
              className={`px-2 py-0.5 rounded text-[10px] font-medium ${
                versionInfo.isProduction
                  ? 'bg-green-100 text-green-700'
                  : 'bg-orange-100 text-orange-700'
              }`}
            >
              {versionInfo.displayVersion}
            </span>
          </div>
          <div className='text-[10px] opacity-70 mt-0.5'>{versionInfo.environment}</div>
        </div>

        <DropdownMenuGroup>
          <DropdownMenuItem onClick={handleLogout}>{t('buttons.logout')}</DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
