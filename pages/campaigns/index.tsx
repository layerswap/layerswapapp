import Layout from '../../components/Layout'
import { InferGetServerSidePropsType } from 'next'
import { getServerSideProps } from '../../helpers/getSettings'
import LayerSwapApiClient from '../../lib/layerSwapApiClient'
import Campaigns from '../../components/Pages/Campaigns'

export default function CampaignsPage({ settings, themeData, apiKey }: InferGetServerSidePropsType<typeof getServerSideProps>) {
    LayerSwapApiClient.apiKey = apiKey
    return (<>
        <Layout settings={settings} themeData={themeData}>
            <Campaigns />
        </Layout>
    </>)
}

export { getServerSideProps };
