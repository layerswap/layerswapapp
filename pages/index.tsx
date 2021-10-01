import Head from 'next/head'
import Swap from '../components/swap/swapComponent'
import Layout from '../components/layout'

export default function Home() {
  return (
    <Layout>
      <main>
        <Swap/>
      </main>
   
    </Layout>
  )
}
