import Header from '@/components/Header'
import './globals.css'
import Footer from '@/components/Footer'
import Script from 'next/script'

const basePath = (process.env.NEXT_PUBLIC_APP_BASE_PATH || '').replace(/\/$/, '')
const faviconPath = (name: string) => `${basePath}/favicon/${name}`

export const metadata = {
  title: 'Layerswap Explorer: All the Transactions in One Place',
  description: 'Layerswap Explorer provides a detailed view of all transactions going through Layerswap. Search by address or txn to get the information you need.',
  icons: {
    icon: [
      { url: faviconPath('favicon.ico'), sizes: '32x32' },
      { url: faviconPath('favicon.svg'), type: 'image/svg+xml' },
      { url: faviconPath('favicon-96x96.png'), sizes: '96x96', type: 'image/png' },
    ],
    apple: { url: faviconPath('apple-touch-icon.png'), sizes: '180x180' },
  },
  manifest: faviconPath('site.webmanifest'),
  alternates: {
    canonical: 'https://layerswap.io/explorer/',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className='flex min-h-screen flex-col items-center max-w-6xl mx-auto'>
        <Header />
        {children}
        <Footer />
        <Script defer data-domain="layerswap.io" src="https://plausible.io/js/script.js" />
      </body>
    </html>
  );
}
