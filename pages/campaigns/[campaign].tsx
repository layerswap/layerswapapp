import Layout from '../../components/layout'
import { InferGetServerSidePropsType } from 'next'
import LayerSwapAuthApiClient from '../../lib/userAuthApiClient'
import RewardComponent from '../../components/Rewards/RewardComponent'
import { THEME_COLORS } from '../../Models/Theme'
import ColorSchema from '../../components/ColorSchema'
import { getServerSideProps } from '../../helpers/getSettings'
import { LayerSwapAppSettings } from '../../Models/LayerSwapAppSettings'

export default function RewardsPage({ settings, themeData }: InferGetServerSidePropsType<typeof getServerSideProps>) {

    let appSettings = new LayerSwapAppSettings(settings)
    LayerSwapAuthApiClient.identityBaseEndpoint = appSettings.discovery.identity_url

    return (<>
        <Layout settings={appSettings}>
            <RewardComponent />
        </Layout>
        <ColorSchema themeData={themeData} />
    </>
    )
}

export { getServerSideProps };
