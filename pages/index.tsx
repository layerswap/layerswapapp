import Head from 'next/head'
import Swap from '../components/swap/swapComponent'

export default function Home() {
  return (
    <div className="container">
      <Head>
        <title>LayerSwap App</title>
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <main>
        <Swap/>
      </main>
   
    </div>
  )
}
