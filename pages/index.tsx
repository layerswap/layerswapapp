import Swap from '../components/swap/swapComponent'
import Layout from '../components/layout'
import settings from '../lib/settings.preval'

export default function Home() {
  return (
    <Layout>
      <main>
        <Swap settings={settings} />
      </main>

    </Layout>
  )
}