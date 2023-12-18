import Layout from '../components/layout'
import { InferGetServerSidePropsType } from 'next'
import dynamic from 'next/dynamic'
import { getServerSideProps } from '../helpers/getSettings'

const DynamicSwap = (dynamic(() => import('../components/swapComponent'), {
  loading: () => <div className={`bg-secondary-900 md:shadow-card rounded-lg w-full sm:overflow-hidden relative`}>
    <div className='text-center text-xl text-secondary-100'>
    </div>
    <div className="relative px-6">
      <div className="flex items-start">
        <div className={`flex flex-nowrap grow`}>
          <div className="w-full pb-6 flex flex-col justify-between space-y-5 text-secondary-text h-full">
            <div className="sm:min-h-[504px]"></div>
          </div>
        </div>
      </div>
    </div>
    <div id="widget_root" />
  </div>
}))

export default function Home({ settings, themeData }: InferGetServerSidePropsType<typeof getServerSideProps>) {
  return (<>
    <Layout settings={settings} themeData={themeData}>
      <DynamicSwap />
    </Layout>
  </>)
}

export { getServerSideProps };
