import Layout from '../../components/layout'
import { InferGetServerSidePropsType } from 'next'
import CampaignDetails from '../../components/Campaigns/Details'
import { getServerSideProps } from '../../helpers/getSettings'

export default function RewardsPage({ settings, themeData }: InferGetServerSidePropsType<typeof getServerSideProps>) {

    return (<>
        <Layout settings={settings} themeData={themeData}>
            <CampaignDetails />
        </Layout>
    </>
    )
}

export { getServerSideProps };
