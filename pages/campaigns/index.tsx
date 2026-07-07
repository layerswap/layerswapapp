import Layout from '../../components/layout'
import { InferGetServerSidePropsType } from 'next'
import Campaigns from '../../components/Campaigns'
import { getServerSideProps } from '../../helpers/getSettings'
import LayerSwapApiClient from '../../lib/apiClients/layerSwapApiClient'
import { useMemo } from 'react'
import { inflateSettings } from '../../helpers/settingsCompression'
import MaintananceContent from '../../components/maintanance/maintanance'

export default function CampaignsPage({ settings, themeData, apiKey }: InferGetServerSidePropsType<typeof getServerSideProps>) {
    LayerSwapApiClient.apiKey = apiKey
    const resolvedSettings = useMemo(() => inflateSettings(settings), [settings])

    if (!resolvedSettings) return <MaintananceContent />

    return (
        <Layout settings={resolvedSettings} themeData={themeData}>
            <Campaigns />
        </Layout>
    )
}

export { getServerSideProps };
