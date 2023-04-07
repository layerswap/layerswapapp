import Layout from '../components/layout'
import LayerSwapApiClient from '../lib/layerSwapApiClient'
import { InferGetServerSidePropsType } from 'next'
import { SettingsProvider } from '../context/settings'
import UserExchanges from '../components/AccountConnect'
import { MenuProvider } from '../context/menu'
import LayerSwapAuthApiClient from '../lib/userAuthApiClient'
import { LayerStatus } from '../Models/LayerStatus'

export default function Home({ settings }: InferGetServerSidePropsType<typeof getServerSideProps>) {
    LayerSwapAuthApiClient.identityBaseEndpoint = settings.discovery.identity_url
    return (
        <div className='wide-page'>
            <Layout>
                <SettingsProvider data={settings}>
                    <MenuProvider>
                        <UserExchanges />
                    </MenuProvider>
                </SettingsProvider>
            </Layout>
        </div>
    )
}

export async function getServerSideProps(context) {
    context.res.setHeader(
        'Cache-Control',
        's-maxage=60, stale-while-revalidate'
    );

    var apiClient = new LayerSwapApiClient();
    const { data: settings } = await apiClient.GetSettingsAsync()

    settings.networks = settings.networks.filter((element) =>
        element.status !== LayerStatus.inactive)

    settings.exchanges = settings.exchanges.filter(e => e.status === LayerStatus.active)

    const resource_storage_url = settings.discovery.resource_storage_url
    if (resource_storage_url[resource_storage_url.length - 1] === "/")
        settings.discovery.resource_storage_url = resource_storage_url.slice(0, -1)

    let isOfframpEnabled = process.env.OFFRAMP_ENABLED != undefined && process.env.OFFRAMP_ENABLED == "true";

    return {
        props: { settings, isOfframpEnabled },
    }
}