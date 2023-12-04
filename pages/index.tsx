import Swap from '../components/swapComponent'
import Layout from '../components/layout'
import { InferGetServerSidePropsType } from 'next'
import { LayerSwapSettings } from '../Models/LayerSwapSettings'
import { THEME_COLORS, ThemeData } from '../Models/Theme'
import LayerSwapApiClient from '../lib/layerSwapApiClient'
import { CryptoNetwork, NetworkType } from '../Models/CryptoNetwork'

type IndexProps = {
  settings?: LayerSwapSettings,
  themeData?: ThemeData,
  inMaintanance: boolean,
  validSignatureisPresent?: boolean,
}

export default function Home({ settings, inMaintanance, themeData }: InferGetServerSidePropsType<typeof getServerSideProps>) {
  return (<>
    <Layout settings={settings} themeData={themeData}>
      <Swap />
    </Layout>
  </>)
}

export async function getServerSideProps(context) {

  let result: IndexProps = {
    inMaintanance: false,
  };
  context.res.setHeader(
    'Cache-Control',
    's-maxage=60, stale-while-revalidate'
  );
  result.themeData = await getThemeData(context.query.theme || context.query.addressSource)

  const apiClient = new LayerSwapApiClient()
  const { data } = await apiClient.GetLSNetworksAsync()

  if (!data) return

  result.settings = {
    networks: data,
    exchanges: [],
  }

  return {
    props: result,
  }
}

const getThemeData = async (theme_name: string) => {
  try {
    // const internalApiClient = new InternalApiClient()
    // const themeData = await internalApiClient.GetThemeData(theme_name);
    // result.themeData = themeData as ThemeData;
    return THEME_COLORS[theme_name] || null;
  }
  catch (e) {
    console.log(e)
  }
}