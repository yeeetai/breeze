import type { Metadata } from 'next'
import './globals.css'

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
      <body>{children}</body>
    </html>
  )
}
