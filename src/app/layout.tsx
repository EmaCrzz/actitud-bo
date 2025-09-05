import type { Metadata, Viewport } from 'next'
import './globals.css'
import { Toaster } from 'sonner'
import PWAInstaller from '@/components/pwa-installer'
import SWUpdateManager from '@/components/sw-update-manager'
import VersionBadge from '@/components/version-badge'

export const metadata: Metadata = {
  title: 'Actitud - Backoffice',
  description: 'Backoffice para Actitud',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Actitud',
  },
  formatDetection: {
    telephone: false,
  },
  openGraph: {
    type: 'website',
    siteName: 'Actitud',
    title: 'Actitud - Backoffice',
    description: 'Backoffice para Actitud',
  },
  twitter: {
    card: 'summary',
    title: 'Actitud - Backoffice',
    description: 'Backoffice para Actitud',
  },
}

export const viewport: Viewport = {
  themeColor: '#260210',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
}

import { unbounded, poppins } from '@/lib/fonts'

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang='en'>
      <head>
        <link href='/icons/favicon-196.png' rel='icon' sizes='196x196' type='image/png' />
        <link href='/icons/apple-icon-180.png' rel='apple-touch-icon' />
        <meta content='yes' name='apple-mobile-web-app-capable' />
        <link
          href='/icons/apple-splash-2048-2732.jpg'
          media='(device-width: 1024px) and (device-height: 1366px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)'
          rel='apple-touch-startup-image'
        />
        <link
          href='/icons/apple-splash-2732-2048.jpg'
          media='(device-width: 1024px) and (device-height: 1366px) and (-webkit-device-pixel-ratio: 2) and (orientation: landscape)'
          rel='apple-touch-startup-image'
        />
        <link
          href='/icons/apple-splash-1668-2388.jpg'
          media='(device-width: 834px) and (device-height: 1194px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)'
          rel='apple-touch-startup-image'
        />
        <link
          href='/icons/apple-splash-2388-1668.jpg'
          media='(device-width: 834px) and (device-height: 1194px) and (-webkit-device-pixel-ratio: 2) and (orientation: landscape)'
          rel='apple-touch-startup-image'
        />
        <link
          href='/icons/apple-splash-1536-2048.jpg'
          media='(device-width: 768px) and (device-height: 1024px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)'
          rel='apple-touch-startup-image'
        />
        <link
          href='/icons/apple-splash-2048-1536.jpg'
          media='(device-width: 768px) and (device-height: 1024px) and (-webkit-device-pixel-ratio: 2) and (orientation: landscape)'
          rel='apple-touch-startup-image'
        />
        <link
          href='/icons/apple-splash-1640-2360.jpg'
          media='(device-width: 820px) and (device-height: 1180px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)'
          rel='apple-touch-startup-image'
        />
        <link
          href='/icons/apple-splash-2360-1640.jpg'
          media='(device-width: 820px) and (device-height: 1180px) and (-webkit-device-pixel-ratio: 2) and (orientation: landscape)'
          rel='apple-touch-startup-image'
        />
        <link
          href='/icons/apple-splash-1668-2224.jpg'
          media='(device-width: 834px) and (device-height: 1112px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)'
          rel='apple-touch-startup-image'
        />
        <link
          href='/icons/apple-splash-2224-1668.jpg'
          media='(device-width: 834px) and (device-height: 1112px) and (-webkit-device-pixel-ratio: 2) and (orientation: landscape)'
          rel='apple-touch-startup-image'
        />
        <link
          href='/icons/apple-splash-1620-2160.jpg'
          media='(device-width: 810px) and (device-height: 1080px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)'
          rel='apple-touch-startup-image'
        />
        <link
          href='/icons/apple-splash-2160-1620.jpg'
          media='(device-width: 810px) and (device-height: 1080px) and (-webkit-device-pixel-ratio: 2) and (orientation: landscape)'
          rel='apple-touch-startup-image'
        />
        <link
          href='/icons/apple-splash-1488-2266.jpg'
          media='(device-width: 744px) and (device-height: 1133px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)'
          rel='apple-touch-startup-image'
        />
        <link
          href='/icons/apple-splash-2266-1488.jpg'
          media='(device-width: 744px) and (device-height: 1133px) and (-webkit-device-pixel-ratio: 2) and (orientation: landscape)'
          rel='apple-touch-startup-image'
        />
        <link
          href='/icons/apple-splash-1320-2868.jpg'
          media='(device-width: 440px) and (device-height: 956px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)'
          rel='apple-touch-startup-image'
        />
        <link
          href='/icons/apple-splash-2868-1320.jpg'
          media='(device-width: 440px) and (device-height: 956px) and (-webkit-device-pixel-ratio: 3) and (orientation: landscape)'
          rel='apple-touch-startup-image'
        />
        <link
          href='/icons/apple-splash-1206-2622.jpg'
          media='(device-width: 402px) and (device-height: 874px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)'
          rel='apple-touch-startup-image'
        />
        <link
          href='/icons/apple-splash-2622-1206.jpg'
          media='(device-width: 402px) and (device-height: 874px) and (-webkit-device-pixel-ratio: 3) and (orientation: landscape)'
          rel='apple-touch-startup-image'
        />
        <link
          href='/icons/apple-splash-1290-2796.jpg'
          media='(device-width: 430px) and (device-height: 932px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)'
          rel='apple-touch-startup-image'
        />
        <link
          href='/icons/apple-splash-2796-1290.jpg'
          media='(device-width: 430px) and (device-height: 932px) and (-webkit-device-pixel-ratio: 3) and (orientation: landscape)'
          rel='apple-touch-startup-image'
        />
        <link
          href='/icons/apple-splash-1179-2556.jpg'
          media='(device-width: 393px) and (device-height: 852px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)'
          rel='apple-touch-startup-image'
        />
        <link
          href='/icons/apple-splash-2556-1179.jpg'
          media='(device-width: 393px) and (device-height: 852px) and (-webkit-device-pixel-ratio: 3) and (orientation: landscape)'
          rel='apple-touch-startup-image'
        />
        <link
          href='/icons/apple-splash-1170-2532.jpg'
          media='(device-width: 390px) and (device-height: 844px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)'
          rel='apple-touch-startup-image'
        />
        <link
          href='/icons/apple-splash-2532-1170.jpg'
          media='(device-width: 390px) and (device-height: 844px) and (-webkit-device-pixel-ratio: 3) and (orientation: landscape)'
          rel='apple-touch-startup-image'
        />
        <link
          href='/icons/apple-splash-1284-2778.jpg'
          media='(device-width: 428px) and (device-height: 926px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)'
          rel='apple-touch-startup-image'
        />
        <link
          href='/icons/apple-splash-2778-1284.jpg'
          media='(device-width: 428px) and (device-height: 926px) and (-webkit-device-pixel-ratio: 3) and (orientation: landscape)'
          rel='apple-touch-startup-image'
        />
        <link
          href='/icons/apple-splash-1125-2436.jpg'
          media='(device-width: 375px) and (device-height: 812px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)'
          rel='apple-touch-startup-image'
        />
        <link
          href='/icons/apple-splash-2436-1125.jpg'
          media='(device-width: 375px) and (device-height: 812px) and (-webkit-device-pixel-ratio: 3) and (orientation: landscape)'
          rel='apple-touch-startup-image'
        />
        <link
          href='/icons/apple-splash-1242-2688.jpg'
          media='(device-width: 414px) and (device-height: 896px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)'
          rel='apple-touch-startup-image'
        />
        <link
          href='/icons/apple-splash-2688-1242.jpg'
          media='(device-width: 414px) and (device-height: 896px) and (-webkit-device-pixel-ratio: 3) and (orientation: landscape)'
          rel='apple-touch-startup-image'
        />
        <link
          href='/icons/apple-splash-828-1792.jpg'
          media='(device-width: 414px) and (device-height: 896px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)'
          rel='apple-touch-startup-image'
        />
        <link
          href='/icons/apple-splash-1792-828.jpg'
          media='(device-width: 414px) and (device-height: 896px) and (-webkit-device-pixel-ratio: 2) and (orientation: landscape)'
          rel='apple-touch-startup-image'
        />
        <link
          href='/icons/apple-splash-1242-2208.jpg'
          media='(device-width: 414px) and (device-height: 736px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)'
          rel='apple-touch-startup-image'
        />
        <link
          href='/icons/apple-splash-2208-1242.jpg'
          media='(device-width: 414px) and (device-height: 736px) and (-webkit-device-pixel-ratio: 3) and (orientation: landscape)'
          rel='apple-touch-startup-image'
        />
        <link
          href='/icons/apple-splash-750-1334.jpg'
          media='(device-width: 375px) and (device-height: 667px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)'
          rel='apple-touch-startup-image'
        />
        <link
          href='/icons/apple-splash-1334-750.jpg'
          media='(device-width: 375px) and (device-height: 667px) and (-webkit-device-pixel-ratio: 2) and (orientation: landscape)'
          rel='apple-touch-startup-image'
        />
        <link
          href='/icons/apple-splash-640-1136.jpg'
          media='(device-width: 320px) and (device-height: 568px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)'
          rel='apple-touch-startup-image'
        />
        <link
          href='/icons/apple-splash-1136-640.jpg'
          media='(device-width: 320px) and (device-height: 568px) and (-webkit-device-pixel-ratio: 2) and (orientation: landscape)'
          rel='apple-touch-startup-image'
        />
      </head>
      <body
        className={`${unbounded.variable} ${poppins.variable} h-screen grid grid-rows-[auto_1fr_auto]`}
      >
        {children}
        <PWAInstaller />
        <SWUpdateManager />
        <VersionBadge position="fixed" />
        <Toaster richColors expand={true} />
      </body>
    </html>
  )
}
