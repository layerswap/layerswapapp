import LayerSwapApiClient from '../lib/layerSwapApiClient';
import Layout from '../components/layout';
import { InferGetServerSidePropsType } from 'next';
import React from 'react';
import { SwapDataProvider } from '../context/swap';
import { TimerProvider } from '../context/timerContext';
import { getThemeData } from '../helpers/settingsHelper';
import Commitment from '../components/Swap/Commitment'
import { DepositMethodProvider } from '../context/depositMethodContext';
import { BalancesDataProvider } from '../context/balances';
import { useRouter } from 'next/router';

const CommitmentDetails = ({ settings, themeData, apiKey }: InferGetServerSidePropsType<typeof getServerSideProps>) => {
    LayerSwapApiClient.apiKey = apiKey

    const router = useRouter()
    const {
        address,
        amount,
        destination,
        destination_asset,
        source,
        source_asseet
    } = router.query


    return (<>
        <Layout settings={settings} themeData={themeData}>
            <SwapDataProvider >
                <TimerProvider>
                    <DepositMethodProvider>
                        <BalancesDataProvider>
                            <Commitment
                                address={address as string}
                                amount={Number(amount)}
                                destination={destination as string}
                                destination_asset={destination_asset as string}
                                source={source as string}
                                source_asseet={source_asseet as string}
                                type='widget'
                            />
                        </BalancesDataProvider>
                    </DepositMethodProvider>
                </TimerProvider>
            </SwapDataProvider >
        </Layout>
    </>)
}

export const getServerSideProps = async (ctx) => {
    const app = ctx.query?.appName || ctx.query?.addressSource
    const apiKey = JSON.parse(process.env.API_KEYS || "{}")?.[app] || process.env.NEXT_PUBLIC_API_KEY
    LayerSwapApiClient.apiKey = apiKey
    const apiClient = new LayerSwapApiClient()
    const { data: networkData } = await apiClient.GetLSNetworksAsync()

    if (!networkData) return

    const settings = {
        networks: networkData,
    }

    const themeData = await getThemeData(ctx.query)

    return {
        props: {
            settings,
            themeData,
            apiKey
        }
    }
}

export default CommitmentDetails