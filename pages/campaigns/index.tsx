import Layout from '../../components/layout'
import { InferGetServerSidePropsType } from 'next'
import LayerSwapAuthApiClient from '../../lib/userAuthApiClient'
import Rewards from '../../components/Rewards'
import { THEME_COLORS } from '../../Models/Theme'
import ColorSchema from '../../components/ColorSchema'
import LayerSwapApiClient from '../../lib/layerSwapApiClient'
import { LayerSwapAppSettings } from '../../Models/LayerSwapAppSettings'

export default function RewardsPage({ settings, themeData }: InferGetServerSidePropsType<typeof getServerSideProps>) {
    LayerSwapAuthApiClient.identityBaseEndpoint = settings.discovery.identity_url
    let appSettings = new LayerSwapAppSettings(settings)

    return (<>
        <Layout settings={appSettings}>
            <Rewards />
        </Layout>
        <ColorSchema themeData={themeData} />
    </>)
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

    const resource_storage_url = settings.discovery.resource_storage_url
    if (resource_storage_url[resource_storage_url.length - 1] === "/")
        settings.discovery.resource_storage_url = resource_storage_url.slice(0, -1)

    let isOfframpEnabled = process.env.OFFRAMP_ENABLED != undefined && process.env.OFFRAMP_ENABLED == "true";

    let themeData = null
    try {
        const theme_name = context.query.theme || context.query.addressSource
        themeData = THEME_COLORS[theme_name]|| null;
    }
    catch (e) {
        console.log(e)
    }

    return {
        props: { settings, isOfframpEnabled, themeData },
    }
}