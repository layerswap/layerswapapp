import { InferGetServerSidePropsType } from 'next'
import { getServerSideProps } from '../../helpers/getSettings'
import { Campaigns } from '@layerswap/widget'
import Layout from '../../components/layout';
import { useRouter } from 'next/router';
import { resolvePersistantQueryParams } from '../../helpers/querryHelper';
import WidgetWrapper from '../../components/WidgetWrapper';


export default function CampaignsPage({ settings, themeData, apiKey }: InferGetServerSidePropsType<typeof getServerSideProps>) {
    const router = useRouter()

    return (<>
        <Layout settings={settings} themeData={themeData}>
            <WidgetWrapper
                settings={settings}
                themeData={themeData}
                apiKey={apiKey}
            >
                <Campaigns
                    goBack={router.back}
                    onCampaignSelect={(campaign) => router.push({ pathname: `/campaigns/${campaign.name}`, query: { ...resolvePersistantQueryParams(router.query) } })}
                />
            </WidgetWrapper>
        </Layout>
    </>)
}

export { getServerSideProps };