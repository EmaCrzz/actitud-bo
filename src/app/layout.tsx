import type { Metadata, Viewport } from 'next'
import './globals.css'
import { Toaster } from 'sonner'

export const metadata: Metadata = {
  title: "Actitud",
  description: "PWA para Actitud",
  manifest: "/manifest.json",
  viewport: "width=device-width, initial-scale=1, maximum-scale=1",
  // appleWebApp: {
  //   title: 'Actitud',
  //   statusBarStyle: 'default'
  // },
  // icons: {
  //   icon: [
  //     { url: "/icon/icon1.png", sizes: "192x192", type: "image/png" },
  //     { url: "/icon/apple-icon.png", sizes: "512x512", type: "image/png" },
  //   ],
  //   apple: [{ url: "/icon/apple-icon.png", sizes: "180x180", type: "image/png" }],
  // },
}
export const viewport: Viewport = {
  themeColor: "#ff1168"
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang='en'>
      <head>
        {/* <link href="/manifest.json" rel="manifest" /> */}
        {/* <meta content="yes" name="apple-mobile-web-app-capable" />
        <meta content="default" name="apple-mobile-web-app-status-bar-style" />
        <meta content="Actitud" name="apple-mobile-web-app-title" />
        <link href="/icon/apple-icon.png" rel="apple-touch-icon" /> */}
      </head>
      <body className='h-screen grid grid-rows-[auto_1fr_auto]'>
        {children}
        <Toaster richColors />
      </body>
    </html>
  )
}
