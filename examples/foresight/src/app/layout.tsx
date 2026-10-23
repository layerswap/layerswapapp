import type { Metadata } from 'next';
import ExampleToolbar from '@/components/example-toolbar';
import './globals.css';

export const metadata: Metadata = {
  title: 'Foresight | Layerswap Example',
  description: 'A prediction market example by Layerswap. Explore demo markets and fund your own wallet with the Layerswap deposit widget, including deposits from Polymarket.',
  icons: { icon: '/icon.svg' },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <ExampleToolbar />
        {children}
      </body>
    </html>
  );
}
