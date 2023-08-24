import Layout from '../../components/layout'
import { InferGetServerSidePropsType } from 'next'
import LayerSwapAuthApiClient from '../../lib/userAuthApiClient'
import RewardComponent from '../../components/Rewards/RewardComponent'
import { getServerSideProps } from '../../lib/serverSidePropsUtils'

export default function RewardsPage({ settings }: InferGetServerSidePropsType<typeof getServerSideProps>) {
    LayerSwapAuthApiClient.identityBaseEndpoint = settings.discovery.identity_url

    return (
        <Layout>
            <RewardComponent />
        </Layout>
    )
}