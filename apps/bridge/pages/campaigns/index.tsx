import Layout from '../../components/Layout'
import { InferGetServerSidePropsType } from 'next'
import { getServerSideProps } from '../../helpers/getSettings'
import { Campaigns } from '@layerswap/widget'

export default function CampaignsPage({ settings, themeData, apiKey }: InferGetServerSidePropsType<typeof getServerSideProps>) {
    return (<>
        <Layout settings={settings} themeData={themeData}>
            <Campaigns settings={settings} themeData={themeData} apiKey={apiKey} integrator='' />
        </Layout>
    </>)
}

export { getServerSideProps };
