import Layout from '../../components/layout'
import { InferGetServerSidePropsType } from 'next'
import LayerSwapAuthApiClient from '../../lib/userAuthApiClient'
import Campaigns from '../../components/Campaigns'
import { getServerSideProps } from '../../helpers/getSettings'
import { LayerSwapAppSettings } from '../../Models/LayerSwapAppSettings'

export default function CampaignsPage({ settings, themeData }: InferGetServerSidePropsType<typeof getServerSideProps>) {
    let appSettings = new LayerSwapAppSettings(settings)
    LayerSwapAuthApiClient.identityBaseEndpoint = appSettings.discovery.identity_url

    return (<>
        <Layout settings={appSettings} themeData={themeData}>
            <Campaigns />
        </Layout>
    </>)
}

export { getServerSideProps };
