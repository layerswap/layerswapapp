import Layout from '../components/layout'
import { InferGetServerSidePropsType } from 'next'
import { LayerSwapSettings } from '../Models/LayerSwapSettings'
import { ThemeData } from '../Models/Theme'
import Swap from '../components/swapComponent'
import { getServerSideProps } from '../helpers/getSettings'
type IndexProps = {
  settings?: LayerSwapSettings,
  themeData?: ThemeData,
  inMaintanance: boolean,
  validSignatureisPresent?: boolean,
}

export default function Home({ settings, themeData }: InferGetServerSidePropsType<typeof getServerSideProps>) {
  return (<>
    <Layout settings={settings} themeData={themeData}>
      <Swap />
    </Layout>
  </>)
}

export { getServerSideProps };
