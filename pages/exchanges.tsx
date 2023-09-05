import Layout from '../components/layout'
import { InferGetServerSidePropsType } from 'next'
import { SettingsProvider } from '../context/settings'
import UserExchanges from '../components/UserExchanges'
import { MenuProvider } from '../context/menu'
import LayerSwapAuthApiClient from '../lib/userAuthApiClient'
import { LayerSwapAppSettings } from '../Models/LayerSwapAppSettings'
import LayerSwapApiClient from '../lib/layerSwapApiClient'

export default function Home({ settings }: InferGetServerSidePropsType<typeof getServerSideProps>) {
    LayerSwapAuthApiClient.identityBaseEndpoint = settings.discovery.identity_url
    let appSettings = new LayerSwapAppSettings(settings)

    return (
        <div className='wide-page'>
            <Layout>
                <SettingsProvider data={appSettings}>
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
        element.status !== "inactive")

    settings.exchanges = settings.exchanges.filter(e => e.status === 'active')

    return {
        props: { settings },
    }
}