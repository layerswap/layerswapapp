import Layout from '../../components/layout'
import { InferGetServerSidePropsType } from 'next'
import LayerSwapAuthApiClient from '../../lib/userAuthApiClient'
import Rewards from '../../components/Rewards'
import { getServerSideProps } from '../../lib/serverSidePropsUtils'

export default function RewardsPage({ settings }: InferGetServerSidePropsType<typeof getServerSideProps>) {
    LayerSwapAuthApiClient.identityBaseEndpoint = settings.discovery.identity_url

    return (
        <Layout>
            <Rewards />
        </Layout>
    )
}