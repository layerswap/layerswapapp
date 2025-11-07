export const metadata = {
  title: 'Layerswap Widget Playground',
  description: 'Layerswap Widget Playground',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" data-color-mode="dark">
      <body>{children}</body>
    </html>
  )
}
