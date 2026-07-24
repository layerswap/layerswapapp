import { InferGetServerSidePropsType } from 'next'
import { getServerSideProps } from '../helpers/getSettings'
import { TransactionsHistory, inflateSettings } from '@layerswap/widget';
import Layout from '../components/layout';
import { useRouter } from 'next/router';
import { resolvePersistantQueryParams } from '../helpers/querryHelper';
import WidgetWrapper from '../components/WidgetWrapper';
import useWindowDimensions from '../hooks/useWindowDimensions';
import { useMemo } from 'react';
import MaintananceContent from '../components/maintanance/maintanance';

export default function Transactions({ settings, themeData, apiKey }: InferGetServerSidePropsType<typeof getServerSideProps>) {

  const router = useRouter()
  const { isMobile } = useWindowDimensions()

  const resolvedSettings = useMemo(() => inflateSettings(settings), [settings])

  if (!resolvedSettings) return <MaintananceContent />

  return (
    <>
      <Layout themeData={themeData}>
        <div className='h-full w-full'>
          <WidgetWrapper
            settings={resolvedSettings}
            themeData={themeData}
            apiKey={apiKey}
            callbacks={{
              onBackClick() {
                router.push({
                  pathname: "/",
                  query: { ...resolvePersistantQueryParams(router.query) }
                })
              }
            }}
          >
            <TransactionsHistory height={isMobile ? '90svh' : '600px'} />
          </WidgetWrapper>
        </div>
      </Layout>
    </>
  )
}

export { getServerSideProps };