import { InferGetServerSidePropsType } from 'next'
import { getServerSideProps } from '../../helpers/getSettings'
import { Campaigns } from '@layerswap/widget'
import Layout from '../../components/layout';
import { useRouter } from 'next/router';
import { resolvePersistantQueryParams } from '../../helpers/querryHelper';
import { EVMProvider, FuelProvider, ParadexProvider, StarknetProvider, BitcoinProvider, ImmutableXProvider, TonProvider, SVMProvider, TronProvider, ImtblPassportProvider } from "@layerswap/wallets";

export default function CampaignsPage({ settings, themeData, apiKey }: InferGetServerSidePropsType<typeof getServerSideProps>) {
    const router = useRouter()
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
                walletProviders={[EVMProvider, StarknetProvider, FuelProvider, ParadexProvider, BitcoinProvider, ImmutableXProvider, TonProvider, SVMProvider, TronProvider, ImtblPassportProvider]}
            />
        </Layout>
    </>)
}

export { getServerSideProps };