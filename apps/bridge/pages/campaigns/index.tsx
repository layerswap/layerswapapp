import { InferGetServerSidePropsType } from 'next'
import { getServerSideProps } from '../../helpers/getSettings'
import { Campaigns } from '@layerswap/widget'
import Layout from '../../components/layout';
import { useRouter } from 'next/router';
import { resolvePersistantQueryParams } from '../../helpers/querryHelper';
import {
    createEVMProvider,
    createStarknetProvider,
    createFuelProvider,
    createParadexProvider,
    createBitcoinProvider,
    createImmutableXProvider,
    createTONProvider,
    createSVMProvider,
    createTronProvider,
    createImmutablePassportProvider
} from "@layerswap/wallets";
import { ZKsyncProvider } from '@layerswap/wallet-zksync';
import { LoopringProvider } from '@layerswap/wallet-loopring';


export default function CampaignsPage({ settings, themeData, apiKey }: InferGetServerSidePropsType<typeof getServerSideProps>) {
    const router = useRouter()
    const imtblPassportConfig = typeof window !== 'undefined' ? {
        clientId: process.env.NEXT_PUBLIC_IMMUTABLE_CLIENT_ID || '',
        publishableKey: process.env.NEXT_PUBLIC_IMMUTABLE_PUBLISHABLE_KEY || '',
        redirectUri: router.basePath ? `${window.location.origin}${router.basePath}/imtblRedirect` : `${window.location.origin}/imtblRedirect`,
        logoutRedirectUri: router.basePath ? `${window.location.origin}${router.basePath}/` : `${window.location.origin}/`
    } : undefined

    const walletConnectConfigs = {
        projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || '',
        name: 'Layerswap',
        description: 'Layerswap App',
        url: 'https://layerswap.io/app/',
        icons: ['https://www.layerswap.io/app/symbol.png']
    }
    const walletProviders = [
        createEVMProvider({ walletConnectConfigs, walletProviderModules: [ZKsyncProvider, LoopringProvider] }),
        createStarknetProvider({ walletConnectConfigs }),
        createFuelProvider(),
        createParadexProvider(),
        createBitcoinProvider(),
        createImmutableXProvider(),
        createTONProvider({
            tonConfigs: {
                manifestUrl: 'https://layerswap.io/app/tonconnect-manifest.json',
                tonApiKey: process.env.NEXT_PUBLIC_TON_API_KEY || ''
            }
        }),
        createSVMProvider({ walletConnectConfigs }),
        createTronProvider(),
        createImmutablePassportProvider({ imtblPassportConfig })
    ];

    return (<>
        <Layout settings={settings} themeData={themeData}>
            <Campaigns
                config={{
                    theme: { ...themeData, borderRadius: 'default', enablePortal: true, enableWideVersion: true, hidePoweredBy: true },
                    apiKey,
                    settings
                }}
                goBack={router.back}
                onCampaignSelect={(campaign) => router.push({ pathname: `/campaign/${campaign.name}`, query: { ...resolvePersistantQueryParams(router.query) } })}
                walletProviders={walletProviders}
            />
        </Layout>
    </>)
}

export { getServerSideProps };