import Layout from '../components/layout'
import { InferGetServerSidePropsType } from 'next'
import UserExchanges from '../components/UserExchanges'
import LayerSwapAuthApiClient from '../lib/userAuthApiClient'
import { getServerSideProps } from '../lib/serverSidePropsUtils'

export default function Home({ settings }: InferGetServerSidePropsType<typeof getServerSideProps>) {
    LayerSwapAuthApiClient.identityBaseEndpoint = settings.discovery.identity_url

    return (
        <div className='wide-page'>
            <Layout>
                <UserExchanges />
            </Layout>
        </div>
    )
}