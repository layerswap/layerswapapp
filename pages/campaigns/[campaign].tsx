import Layout from '../../components/layout'
import { InferGetServerSidePropsType } from 'next'
import LayerSwapAuthApiClient from '../../lib/userAuthApiClient'
import RewardComponent from '../../components/Rewards/RewardComponent'
import { getServerSideProps } from '../../helpers/getSettings'
import { LayerSwapAppSettings } from '../../Models/LayerSwapAppSettings'

export default function RewardsPage({ settings }: InferGetServerSidePropsType<typeof getServerSideProps>) {
    LayerSwapAuthApiClient.identityBaseEndpoint = settings.discovery.identity_url
    let appSettings = new LayerSwapAppSettings(settings)

    appSettings.networks = appSettings.networks.filter((element) =>
        element.status !== "inactive")

    appSettings.exchanges = appSettings.exchanges.filter(e => e.status === 'active')

    return (
        <Layout settings={appSettings}>
            <RewardComponent />
        </Layout>
    )
}

export { getServerSideProps };
