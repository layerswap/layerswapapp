import { InferGetServerSidePropsType } from 'next'
import { getServerSideProps } from '../helpers/getSettings'
import { TransactionsHistory } from '@layerswap/widget';
import Layout from '../components/layout';
import { useRouter } from 'next/router';
import { resolvePersistantQueryParams } from '../helpers/querryHelper';
import WidgetWrapper from '../components/WidgetWrapper';
import useWindowDimensions from '../hooks/useWindowDimensions';

export default function Transactions({ settings, themeData, apiKey }: InferGetServerSidePropsType<typeof getServerSideProps>) {

  const router = useRouter()
  const { isMobile } = useWindowDimensions()

  return (
    <>
      <Layout settings={settings} themeData={themeData}>
        <div className='h-full w-full'>
          <WidgetWrapper
            settings={settings}
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