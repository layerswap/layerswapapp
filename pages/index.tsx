import Swap from '../components/swapComponent'
import Layout from '../components/layout'
import LayerSwapApiClient from '../lib/layerSwapApiClient'
import { InferGetServerSidePropsType } from 'next'
import { SettingsProvider } from '../context/settings'
import { LayerSwapSettings } from '../Models/LayerSwapSettings'
import { QueryParams } from '../Models/QueryParams'
import MaintananceContent from '../components/maintanance/maintanance'
import NetworkSettings from '../lib/NetworkSettings'

type IndexProps = {
  settings?: LayerSwapSettings,
  query?: QueryParams,
  inMaintanance: boolean,
}

export default function Home({ settings, inMaintanance }: InferGetServerSidePropsType<typeof getServerSideProps>) {
  return (
    <Layout>
      <div className="content-center items-center justify-center mb-5 space-y-5 flex-col  container mx-auto sm:px-6 lg:px-8 max-w-2xl">
        <div className='flex flex-col space-y-5 animate-fade-in'>
          {
            inMaintanance
              ?
              <MaintananceContent />
              :
              <SettingsProvider data={settings}>
                <Swap />
              </SettingsProvider>
          }
        </div>
      </div>
    </Layout>

  )
}

export async function getServerSideProps(context) {
  let result: IndexProps = {
    inMaintanance: false,
  };

  context.res.setHeader(
    'Cache-Control',
    's-maxage=60, stale-while-revalidate'
  );

  var apiClient = new LayerSwapApiClient();
  const response = await apiClient.fetchSettingsAsync()

  response.data.networks = response.data.networks.filter((element) =>
    element.status !== "inactive" && !NetworkSettings.KnownSettings[element?.internal_name]?.ForceDisable)
  response.data.exchanges = response.data.exchanges.filter((element) => element.status !== "inactive");

  const resource_storage_url = response.data.discovery.resource_storage_url
  if (resource_storage_url[resource_storage_url.length - 1] === "/")
    response.data.discovery.resource_storage_url = resource_storage_url.slice(0, -1)

  result.settings = response;
  if (!result.settings.data.networks.some(x => x.status === "active")) {
    result.inMaintanance = true;
  }
  return {
    props: result,
  }
}
