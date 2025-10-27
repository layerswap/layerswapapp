import { InferGetServerSidePropsType } from 'next'
import { getServerSideProps } from '../../helpers/getSettings'
import { Campaigns } from '@layerswap/widget'
import Layout from '../../components/layout';
import { useRouter } from 'next/router';
import { resolvePersistantQueryParams } from '../../helpers/querryHelper';
import { EVMProvider } from '@layerswap/wallet-evm';
import { StarknetProvider } from '@layerswap/wallet-starknet';
import { FuelProvider } from '@layerswap/wallet-fuel';
import { ParadexProvider } from '@layerswap/wallet-paradex';
import { BitcoinProvider } from '@layerswap/wallet-bitcoin';
import { ImmutableXProvider } from '@layerswap/wallet-imtbl-x';
import { TonProvider } from '@layerswap/wallet-ton';
import { SVMProvider } from '@layerswap/wallet-svm';
import { TronProvider } from '@layerswap/wallet-tron';
import { ImtblPassportProvider } from '@layerswap/wallet-imtbl-passport';

export default function CampaignsPage({ settings, themeData, apiKey }: InferGetServerSidePropsType<typeof getServerSideProps>) {
    const router = useRouter()
    return (<>
        <Layout settings={settings} themeData={themeData}>
            <Campaigns
                config={{ theme: themeData, apiKey, settings }}
                goBack={router.back}
                onCampaignSelect={(campaign) => router.push({ pathname: `/campaign/${campaign.name}`, query: { ...resolvePersistantQueryParams(router.query) } })}
                walletProviders={[EVMProvider, StarknetProvider, FuelProvider, ParadexProvider, BitcoinProvider, ImmutableXProvider, TonProvider, SVMProvider, TronProvider, ImtblPassportProvider]}
            />
        </Layout>
    </>)
}

export { getServerSideProps };