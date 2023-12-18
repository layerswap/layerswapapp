import Layout from '../components/layout'
import { InferGetServerSidePropsType } from 'next'
import { LayerSwapSettings } from '../Models/LayerSwapSettings'
import { THEME_COLORS, ThemeData } from '../Models/Theme'
import LayerSwapApiClient from '../lib/layerSwapApiClient'
import dynamic from 'next/dynamic'

type IndexProps = {
  settings?: LayerSwapSettings,
  themeData?: ThemeData,
  inMaintanance: boolean,
  validSignatureisPresent?: boolean,
}

const DynamicSwap = (dynamic(() => import('../components/swapComponent'), {
  loading: () => <div className={`bg-secondary-900 md:shadow-card rounded-lg w-full sm:overflow-hidden relative`}>
    <div className='text-center text-xl text-secondary-100'>
    </div>
    <div className="relative px-6">
      <div className="flex items-start">
        <div className={`flex flex-nowrap grow`}>
          <div className="w-full pb-6 flex flex-col justify-between space-y-5 text-secondary-text h-full">
            <div className="sm:min-h-[504px]"></div>
          </div>
        </div>
      </div>
    </div>
    <div id="widget_root" />
  </div>
}))

export default function Home({ settings, inMaintanance, themeData }: InferGetServerSidePropsType<typeof getServerSideProps>) {
  return (<>
    <Layout settings={settings} themeData={themeData}>
      <DynamicSwap />
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