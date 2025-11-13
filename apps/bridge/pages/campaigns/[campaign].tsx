import { InferGetServerSidePropsType } from 'next'
import { getServerSideProps } from '../../helpers/getSettings'
import { CampaignDetails } from '@layerswap/widget'
import { useRouter } from 'next/router';
import Layout from '../../components/layout';
import { EVMProvider, FuelProvider, ParadexProvider, StarknetProvider, BitcoinProvider, ImmutableXProvider, TonProvider, SVMProvider, TronProvider, ImtblPassportProvider } from "@layerswap/wallets";

export default function RewardsPage({ settings, themeData, apiKey }: InferGetServerSidePropsType<typeof getServerSideProps>) {
    const router = useRouter();
    return (<>
        <Layout settings={settings} themeData={themeData}>
            <CampaignDetails
                config={{
                    theme: { ...themeData, borderRadius: 'default', enablePortal: true, enableWideVersion: true, hidePoweredBy: true },
                    apiKey,
                    settings
                }}
                campaignName={router.query.campaign?.toString()!}
                goBack={router.back}
                walletProviders={[EVMProvider, StarknetProvider, FuelProvider, ParadexProvider, BitcoinProvider, ImmutableXProvider, TonProvider, SVMProvider, TronProvider, ImtblPassportProvider]}
            />
        </Layout>
    </>
    )
}

export { getServerSideProps };
