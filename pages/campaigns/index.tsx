import Layout from '../../components/layout'
import LayerSwapApiClient from '../../lib/layerSwapApiClient'
import { InferGetServerSidePropsType } from 'next'
import { SettingsProvider } from '../../context/settings'
import { MenuProvider } from '../../context/menu'
import LayerSwapAuthApiClient from '../../lib/userAuthApiClient'
import { LayerSwapAppSettings } from '../../Models/LayerSwapAppSettings'
import Rewards from '../../components/Rewards'

export default function RewardsPage({ settings }: InferGetServerSidePropsType<typeof getServerSideProps>) {
    LayerSwapAuthApiClient.identityBaseEndpoint = settings.discovery.identity_url
    let appSettings = new LayerSwapAppSettings(settings)

    return (
        <Layout>
            <SettingsProvider data={appSettings}>
                <MenuProvider>
                    <Rewards />
                </MenuProvider>
            </SettingsProvider>
        </Layout>
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

    let isOfframpEnabled = process.env.OFFRAMP_ENABLED != undefined && process.env.OFFRAMP_ENABLED == "true";

    return {
        props: { settings, isOfframpEnabled },
    }
}