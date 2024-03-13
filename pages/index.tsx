import Layout from '../components/layout'
import { InferGetServerSidePropsType } from 'next'
import Swap from '../components/swapComponent'
import { getServerSideProps } from '../helpers/getSettings'
import CardContainer from '../components/cardContainer'
import { Info } from 'lucide-react'

export default function Home({ settings, themeData }: InferGetServerSidePropsType<typeof getServerSideProps>) {
  return (
    <Layout settings={settings} themeData={themeData}>
      <Swap />
      <div className="flex items-stretch flex-col">
        <CardContainer  >
          <div className="flex flex-col justify-center p-6 text-primary-text md:min-h-fit sm:min-h-[400px]">
            <h1 className="text-xl tracking-tight space-y-4">
              <p className='font-semibold'>
                Update notice
              </p>
              <p className="text-secondary-text">
                We're gearing up for the Ethereum Dencun hard fork! As part of our preparations, transfers from Ethereum and its L2 networks will be back online at 14:55 UTC. Stay tuned and thank you for your support!
              </p>
            </h1>
          </div>
        </CardContainer>
      </div>
    </Layout>
  )
}

export { getServerSideProps };
