import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Foresight — A little conviction goes a long way',
  description: 'Explore a demo prediction market. Connect with Reown or Privy and fund your own wallet through Layerswap, including deposits from Polymarket.',
  icons: { icon: '/icon.svg' },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
