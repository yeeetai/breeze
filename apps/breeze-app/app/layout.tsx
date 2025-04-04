import type { Metadata } from 'next'
import './globals.css'
import MiniKitProvider from '@/components/minikit-provider'

export const metadata: Metadata = {
  title: 'Breeze',
  description: 'Anonymous Random Chat Room App in World App',
  generator: 'v0.dev',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <MiniKitProvider>
        <body>{children}</body>
      </MiniKitProvider>
    </html>
  )
}
