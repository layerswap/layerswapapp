import { InferGetServerSidePropsType } from 'next'
import { getServerSideProps } from '../../helpers/getSettings'
import { Campaigns } from '@layerswap/widget'
import Layout from '../../components/layout';
import { useRouter } from 'next/router';
import { resolvePersistantQueryParams } from '../../helpers/querryHelper';

export default function CampaignsPage({ settings, themeData, apiKey }: InferGetServerSidePropsType<typeof getServerSideProps>) {
    const router = useRouter()
    return (<>
        <Layout settings={settings} themeData={themeData}>
            <Campaigns settings={settings} themeData={themeData} apiKey={apiKey} integrator='layerswap' goBack={router.back} onCampaignSelect={(campaign) => router.push({ pathname: `/campaign/${campaign.name}`, query: { ...resolvePersistantQueryParams(router.query) } })} />
        </Layout>
    </>)
}

export { getServerSideProps };
