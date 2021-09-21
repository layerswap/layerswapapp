import Head from 'next/head'
import Swap from '../components/swap/swapComponent'
import Layout from '../components/layout'

export default function Home() {
  return (
    <Layout>
      <Head>
        <title>LayerSwap App</title>
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <main>
        <Swap/>
      </main>
   
    </Layout>
  )
}
