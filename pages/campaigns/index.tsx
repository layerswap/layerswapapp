import Layout from '../../components/layout'
import { InferGetServerSidePropsType } from 'next'
import Campaigns from '../../components/Campaigns'
import { getServerSideProps } from '../../helpers/getSettings'
import LayerSwapApiClient from '../../lib/layerSwapApiClient'

export default function CampaignsPage({ settings, themeData, apiKey }: InferGetServerSidePropsType<typeof getServerSideProps>) {
    LayerSwapApiClient.apiKey = apiKey
    return (<>
        <Layout settings={settings} themeData={themeData}>
            <Campaigns />
        </Layout>
    </>)
}

export { getServerSideProps };
