import { InferGetServerSidePropsType } from 'next'
import { getServerSideProps } from '../../helpers/getSettings'
import { CampaignDetails, inflateSettings } from '@layerswap/widget'
import { useRouter } from 'next/router';
import Layout from '../../components/layout';
import WidgetWrapper from '../../components/WidgetWrapper';
import { useMemo } from 'react';
import MaintananceContent from '../../components/maintanance/maintanance';

export default function RewardsPage({ settings, themeData, apiKey }: InferGetServerSidePropsType<typeof getServerSideProps>) {
    const router = useRouter();
    const resolvedSettings = useMemo(() => inflateSettings(settings), [settings])
  
    if (!resolvedSettings) return <MaintananceContent />

    return (<>
        <Layout themeData={themeData}>
            <WidgetWrapper
                settings={resolvedSettings}
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
