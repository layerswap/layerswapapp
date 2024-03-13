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
    </Layout>
  )
}

export { getServerSideProps };
