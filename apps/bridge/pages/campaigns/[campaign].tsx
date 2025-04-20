import Layout from '../../components/Layout'
import { InferGetServerSidePropsType } from 'next'
import { getServerSideProps } from '../../helpers/getSettings'
import { CampaignDetails } from '@layerswap/widget'

export default function RewardsPage({ settings, themeData, apiKey }: InferGetServerSidePropsType<typeof getServerSideProps>) {
    return (<>
        <Layout settings={settings} themeData={themeData}>
            <CampaignDetails apiKey={apiKey} settings={settings} themeData={themeData} />
        </Layout>
    </>
    )
}

export { getServerSideProps };
