import Layout from '../../components/layout'
import { InferGetServerSidePropsType } from 'next'
import LayerSwapAuthApiClient from '../../lib/userAuthApiClient'
import Rewards from '../../components/Rewards'
import { THEME_COLORS } from '../../Models/Theme'
import ColorSchema from '../../components/ColorSchema'
import LayerSwapApiClient from '../../lib/layerSwapApiClient'
import { getServerSideProps } from '../../helpers/getSettings'
import { LayerSwapAppSettings } from '../../Models/LayerSwapAppSettings'

export default function RewardsPage({ settings, themeData }: InferGetServerSidePropsType<typeof getServerSideProps>) {
    let appSettings = new LayerSwapAppSettings(settings)
    LayerSwapAuthApiClient.identityBaseEndpoint = appSettings.discovery.identity_url

    return (<>
        <Layout settings={appSettings}>
            <Rewards />
        </Layout>
        <ColorSchema themeData={themeData} />
    </>)
}

export { getServerSideProps };
