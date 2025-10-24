import { InferGetServerSidePropsType } from 'next'
import { getServerSideProps } from '../../helpers/getSettings'
import { CampaignDetails } from '@layerswap/widget'
import { useRouter } from 'next/router';
import Layout from '../../components/layout';
import { EVMProvider } from '@layerswap/wallet-evm';
import { StarknetProvider } from '@layerswap/wallet-starknet';
import { FuelProvider } from '@layerswap/wallet-fuel';
import { ParadexProvider } from '@layerswap/wallet-paradex';
import { BitcoinProvider } from '@layerswap/wallet-bitcoin';
import { ImmutableXProvider } from '@layerswap/wallet-imtblX';
import { TonProvider } from '@layerswap/wallet-ton';
import { SVMProvider } from '@layerswap/wallet-svm';
import { TronProvider } from '@layerswap/wallet-tron';
import { ImtblPassportProvider } from '@layerswap/wallet-imtblPassport';

export default function RewardsPage({ settings, themeData, apiKey }: InferGetServerSidePropsType<typeof getServerSideProps>) {
    const router = useRouter();
    return (<>
        <Layout settings={settings} themeData={themeData}>
            <CampaignDetails
                config={{ theme: themeData, apiKey, settings }}
                campaignName={router.query.campaign?.toString()!}
                goBack={router.back}
                walletProviders={[EVMProvider, StarknetProvider, FuelProvider, ParadexProvider, BitcoinProvider, ImmutableXProvider, TonProvider, SVMProvider, TronProvider, ImtblPassportProvider]}
            />
        </Layout>
    </>
    )
}

export { getServerSideProps };
