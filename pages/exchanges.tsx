import Layout from '../components/layout'
import LayerSwapApiClient from '../lib/layerSwapApiClient'
import { InferGetServerSidePropsType } from 'next'
import { SettingsProvider } from '../context/settings'
import { AuthProvider } from '../context/authContext'
import UserExchanges from '../components/exchangesComponent'
import { MenuProvider } from '../context/menu'
import NetworkSettings from '../lib/NetworkSettings'
import LayerSwapAuthApiClient from '../lib/userAuthApiClient'

export default function Home({ response }: InferGetServerSidePropsType<typeof getServerSideProps>) {
    LayerSwapAuthApiClient.identityBaseEndpoint = response.data.discovery.identity_url
    return (
        <div className='wide-page'>
            <Layout>
                <SettingsProvider data={response.data}>
                    <AuthProvider>
                        <MenuProvider>
                            <UserExchanges />
                        </MenuProvider>
                    </AuthProvider>
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
    const response = await apiClient.fetchSettingsAsync()

    response.data.networks = response.data.networks.filter((element) =>
        element.status !== "inactive")

    response.data.exchanges = response.data.exchanges.filter((element) => element.status !== "inactive");

    const resource_storage_url = response.data.discovery.resource_storage_url
    if (resource_storage_url[resource_storage_url.length - 1] === "/")
        response.data.discovery.resource_storage_url = resource_storage_url.slice(0, -1)

    let isOfframpEnabled = process.env.OFFRAMP_ENABLED != undefined && process.env.OFFRAMP_ENABLED == "true";

    return {
        props: { response, isOfframpEnabled },
    }
}
