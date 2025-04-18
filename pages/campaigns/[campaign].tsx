import Layout from '../../components/Layout'
import { InferGetServerSidePropsType } from 'next'
import { getServerSideProps } from '../../helpers/getSettings'
import LayerSwapApiClient from '../../lib/layerSwapApiClient'
import CampaignDetails from '../../components/Pages/Campaigns/Details'

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
