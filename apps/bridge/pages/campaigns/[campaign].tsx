import { InferGetServerSidePropsType } from 'next'
import { getServerSideProps } from '../../helpers/getSettings'
import { CampaignDetails } from '@layerswap/widget'
import { useRouter } from 'next/router';
import Layout from '../../components/layout';

export default function RewardsPage({ settings, themeData, apiKey }: InferGetServerSidePropsType<typeof getServerSideProps>) {
    const router = useRouter();
    return (<>
        <Layout settings={settings} themeData={themeData}>
            <CampaignDetails apiKey={apiKey} settings={settings} themeData={themeData} campaignName={router.query.campaign?.toString()!} integrator='layerswap' goBack={router.back}  />
        </Layout>
    </>
    )
}

export { getServerSideProps };
