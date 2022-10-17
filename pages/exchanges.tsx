import Layout from '../components/layout'
import LayerSwapApiClient from '../lib/layerSwapApiClient'
import { InferGetServerSidePropsType } from 'next'
import { CryptoNetwork } from '../Models/CryptoNetwork'
import { SettingsProvider } from '../context/settings'
import { AuthProvider } from '../context/authContext'
import UserExchanges from '../components/exchangesComponent'
import { MenuProvider } from '../context/menu'
import NetworkSettings from '../lib/NetworkSettings'

export default function Home({ response }: InferGetServerSidePropsType<typeof getServerSideProps>) {
    return (
        <Layout>
            <div className="flex content-center items-center justify-center mb-5 space-y-5 flex-col container mx-auto sm:px-6 lg:px-8">
                <div className="flex flex-col text-white animate-fade-in">
                    <SettingsProvider data={response}>
                        <AuthProvider>
                            <MenuProvider>
                                <UserExchanges />
                            </MenuProvider>
                        </AuthProvider>
                    </SettingsProvider>
                </div>
            </div>
        </Layout>
    )
}

export async function getServerSideProps(context) {
    context.res.setHeader(
        'Cache-Control',
        's-maxage=60, stale-while-revalidate'
    );

    var query = context.query;
    var apiClient = new LayerSwapApiClient();
    const response = await apiClient.fetchSettingsAsync()

    response.data.networks = response.data.networks.filter((element) =>
        element.status !== "inactive" && !NetworkSettings.KnownSettings[element?.internal_name]?.ForceDisable)

    response.data.exchanges = response.data.exchanges.filter((element) => element.status !== "inactive");

    const resource_storage_url = response.data.discovery.resource_storage_url
    if (resource_storage_url[resource_storage_url.length - 1] === "/")
        response.data.discovery.resource_storage_url = resource_storage_url.slice(0, -1)

    let isOfframpEnabled = process.env.OFFRAMP_ENABLED != undefined && process.env.OFFRAMP_ENABLED == "true";

    return {
        props: { response, query, isOfframpEnabled },
    }
}
