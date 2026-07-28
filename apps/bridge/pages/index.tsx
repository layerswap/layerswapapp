import Layout from '../components/layout'
import { InferGetServerSidePropsType } from 'next'
import { getServerSideProps } from '../helpers/getSettings'
import SwapPage from '../components/Pages/Swap'
import { LayerswapApiClient } from '@layerswap/widget/internal'
import { useMemo } from 'react'
import MaintananceContent from '../components/maintanance/maintanance'
import { inflateSettings } from '@layerswap/widget'

export default function Home({ settings, themeData, apiKey, initialValues }: InferGetServerSidePropsType<typeof getServerSideProps>) {
  LayerswapApiClient.apiKey = apiKey
  const resolvedSettings = useMemo(() => inflateSettings(settings), [settings])
  
  if (!resolvedSettings) return <MaintananceContent />

  return (
    <Layout themeData={themeData}>
      <SwapPage
        apiKey={apiKey}
        settings={resolvedSettings}
        themeData={themeData}
        initialValues={initialValues}
      />
    </Layout>
  )
}

export { getServerSideProps };