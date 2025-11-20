import { InferGetServerSidePropsType } from 'next'
import { getServerSideProps } from '../../helpers/getSettings'
import { CampaignDetails } from '@layerswap/widget'
import { useRouter } from 'next/router';
import Layout from '../../components/layout';
import WidgetWrapper from '../../components/WidgetWrapper';

export default function RewardsPage({ settings, themeData, apiKey }: InferGetServerSidePropsType<typeof getServerSideProps>) {
    const router = useRouter();

return (<>
        <Layout settings={settings} themeData={themeData}>
            <WidgetWrapper
                settings={settings}
                themeData={themeData}
                apiKey={apiKey}
            >
                <CampaignDetails
                    campaignName={router.query.campaign?.toString()!}
                    goBack={router.back}
                />
            </WidgetWrapper>
        </Layout>
    </>
    )
}

export { getServerSideProps };
