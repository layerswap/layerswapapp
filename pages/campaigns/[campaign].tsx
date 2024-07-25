import Layout from '../../components/layout'
import { InferGetServerSidePropsType } from 'next'
import CampaignDetails from '../../components/Campaigns/Details'
import { getServerSideProps } from '../../helpers/getSettings'
import LayerSwapApiClient from '../../lib/layerSwapApiClient'

export default function RewardsPage({ settings, themeData, apiKey }: InferGetServerSidePropsType<typeof getServerSideProps>) {
    LayerSwapApiClient.apiKey = apiKey
    return (<>
        <Layout settings={settings} themeData={themeData}>
            <CampaignDetails />
        </Layout>
    </>
    )
}

export { getServerSideProps };
