import Layout from '../components/layout'
import { InferGetServerSidePropsType } from 'next'
import { SettingsProvider } from '../context/settings'
import UserExchanges from '../components/UserExchanges'
import { MenuProvider } from '../context/menu'
import LayerSwapAuthApiClient from '../lib/userAuthApiClient'
import { LayerSwapAppSettings } from '../Models/LayerSwapAppSettings'
import { getServerSideSettings } from '../helpers/getSettings'

export default function Home({ settings }: InferGetServerSidePropsType<typeof getServerSideSettings>) {
    LayerSwapAuthApiClient.identityBaseEndpoint = settings.discovery.identity_url
    let appSettings = new LayerSwapAppSettings(settings)

    appSettings.networks = appSettings.networks.filter((element) =>
        element.status !== "inactive")

    appSettings.exchanges = appSettings.exchanges.filter(e => e.status === 'active')

    return (
        <div className='wide-page'>
            <Layout>
                <SettingsProvider data={appSettings}>
                    <MenuProvider>
                        <UserExchanges />
                    </MenuProvider>
                </SettingsProvider>
            </Layout>
        </div>
    )
}