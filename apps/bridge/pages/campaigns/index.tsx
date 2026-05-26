import { InferGetServerSidePropsType } from 'next'
import { getServerSideProps } from '../../helpers/getSettings'
import { Campaigns, inflateSettings } from '@layerswap/widget'
import Layout from '../../components/layout';
import { useRouter } from 'next/router';
import { resolvePersistantQueryParams } from '../../helpers/querryHelper';
import WidgetWrapper from '../../components/WidgetWrapper';
import { useMemo } from 'react';
import MaintananceContent from '../../components/maintanance/maintanance';


export default function CampaignsPage({ settings, themeData, apiKey }: InferGetServerSidePropsType<typeof getServerSideProps>) {
    const router = useRouter()
    const resolvedSettings = useMemo(() => inflateSettings(settings), [settings])
  
    if (!resolvedSettings) return <MaintananceContent />
    
    return (<>
        <Layout themeData={themeData}>
            <WidgetWrapper
                settings={resolvedSettings}
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