import Layout from '../../components/layout'
import { InferGetServerSidePropsType } from 'next'
import Campaigns from '../../components/Campaigns'
import { getServerSideProps } from '../../helpers/getSettings'

export default function CampaignsPage({ settings, themeData }: InferGetServerSidePropsType<typeof getServerSideProps>) {

    return (<>
        <Layout settings={settings} themeData={themeData}>
            <Campaigns />
        </Layout>
    </>)
}

export { getServerSideProps };
