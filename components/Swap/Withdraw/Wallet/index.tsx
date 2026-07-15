import { ComponentType, FC, useEffect, useMemo } from "react";
import KnownInternalNames from "@/lib/knownIds";
import { NetworkType } from "@/Models/Network";
import { SwapBasicData } from "@/lib/apiClients/layerSwapApiClient";
import { WithdrawalProvider } from "@/context/withdrawalContext";
import useWallet from "@/hooks/useWallet";
import { useSelectedAccount } from "@/context/swapAccounts";
import dynamic from "next/dynamic";
import { WithdrawPageProps } from "./Common/sharedTypes";

const StarknetWalletWithdrawStep = dynamic<WithdrawPageProps>(
    () => import("./WithdrawalProviders/StarknetWalletWithdraw").then((module) => module.StarknetWalletWithdrawStep),
    { ssr: false }
);
const TonWalletWithdrawStep = dynamic<WithdrawPageProps>(
    () => import("./WithdrawalProviders/TonWalletWithdraw").then((module) => module.TonWalletWithdrawStep),
    { ssr: false }
);
const ParadexWalletWithdraw = dynamic<WithdrawPageProps>(
    () => import("./WithdrawalProviders/paradex").then((module) => module.ParadexWalletWithdraw),
    { ssr: false }
);
const FuelWalletWithdrawStep = dynamic<WithdrawPageProps>(
    () => import("./WithdrawalProviders/FuelWalletWithdrawal").then((module) => module.FuelWalletWithdrawStep),
    { ssr: false }
);
const TronWalletWithdraw = dynamic<WithdrawPageProps>(
    () => import("./WithdrawalProviders/TronWalletWithdraw").then((module) => module.TronWalletWithdraw),
    { ssr: false }
);
const BitcoinWalletWithdrawStep = dynamic<WithdrawPageProps>(
    () => import("./WithdrawalProviders/BitcoinWalletWithdraw").then((module) => module.BitcoinWalletWithdrawStep),
    { ssr: false }
);
const SVMWalletWithdrawStep = dynamic<WithdrawPageProps>(
    () => import("./WithdrawalProviders/SVMWalletWithdraw").then((module) => module.SVMWalletWithdrawStep),
    { ssr: false }
);
const EVMWalletWithdrawal = dynamic<WithdrawPageProps>(
    () => import("./WithdrawalProviders/EVMWalletWithdraw").then((module) => module.EVMWalletWithdrawal),
    { ssr: false }
);
const HyperliquidWalletWithdraw = dynamic<WithdrawPageProps>(
    () => import('../Wallet/WithdrawalProviders/Hyperliquid').then(m => m.HyperliquidWalletWithdraw),
    { ssr: false }
)
const PolymarketWalletWithdraw = dynamic<WithdrawPageProps>(
    () => import('../Wallet/WithdrawalProviders/Polymarket').then(m => m.PolymarketWalletWithdraw),
    { ssr: false }
)

type Props = {
    swapData: SwapBasicData
    swapId: string | undefined
    refuel: boolean
    onWalletWithdrawalSuccess?: () => void
    onCancelWithdrawal?: () => void
};
//TODO have separate components for evm and none_evm as others are sweepless anyway
export const WalletTransferAction: FC<Props> = ({ swapData, swapId, refuel, onWalletWithdrawalSuccess, onCancelWithdrawal }) => {
    const { source_network } = swapData
    const source_network_internal_name = source_network?.name;

    const { provider, wallets } = useWallet(source_network, "withdrawal")
    const selectedSourceAccount = useSelectedAccount("from", source_network?.name);

    const WithdrawalPages = useMemo(() => [
        {
            supportedNetworks: [
                KnownInternalNames.Networks.StarkNetMainnet,
                KnownInternalNames.Networks.StarkNetGoerli,
                KnownInternalNames.Networks.StarkNetSepolia
            ],
            component: StarknetWalletWithdrawStep
        },
        {
            supportedNetworks: [
                KnownInternalNames.Networks.TONMainnet,
                KnownInternalNames.Networks.TONTestnet
            ],
            component: TonWalletWithdrawStep
        },
        {
            supportedNetworks: [
                KnownInternalNames.Networks.ParadexMainnet,
                KnownInternalNames.Networks.ParadexTestnet
            ],
            component: ParadexWalletWithdraw
        },
        {
            supportedNetworks: [
                KnownInternalNames.Networks.FuelMainnet,
                KnownInternalNames.Networks.FuelTestnet
            ],
            component: FuelWalletWithdrawStep
        },
        {
            supportedNetworks: [
                KnownInternalNames.Networks.TronMainnet,
                KnownInternalNames.Networks.TronTestnet
            ],
            component: TronWalletWithdraw
        },
        {
            supportedNetworks: [
                KnownInternalNames.Networks.BitcoinMainnet,
                KnownInternalNames.Networks.BitcoinTestnet
            ],
            component: BitcoinWalletWithdrawStep
        },
        {
            supportedNetworks: [
                source_network?.type == NetworkType.Solana ? source_network.name : undefined
            ],
            component: SVMWalletWithdrawStep
        },
        {
            supportedNetworks: [
                source_network?.type == NetworkType.EVM ? source_network.name : undefined
            ],
            component: EVMWalletWithdrawal
        },
        {
            supportedNetworks: [
                source_network?.type == NetworkType.Hyperliquid ? source_network.name : undefined
            ],
            component: HyperliquidWalletWithdraw
        },
        {
            supportedNetworks: [
                source_network?.type == NetworkType.Polymarket ? source_network.name : undefined
            ],
            component: PolymarketWalletWithdraw
        }
    ] as { supportedNetworks: (string | undefined)[]; component: ComponentType<WithdrawPageProps> }[], [source_network])

    const WithdrawalComponent = WithdrawalPages.find(page =>
        page.supportedNetworks.includes(source_network_internal_name)
    )?.component;

    useEffect(() => {
        const selectedWallet = wallets.find(w => w.id === selectedSourceAccount?.id && w.addresses.some(a => a.toLowerCase() === selectedSourceAccount.address.toLowerCase()))
        if (selectedSourceAccount && selectedWallet) {
            provider?.switchAccount?.(selectedWallet, selectedSourceAccount.address)
        }
    }, [selectedSourceAccount?.address])

    return <>
        {
            swapData && WithdrawalComponent &&
            <WithdrawalProvider onWalletWithdrawalSuccess={onWalletWithdrawalSuccess} onCancelWithdrawal={onCancelWithdrawal}>
                <WithdrawalComponent
                    swapId={swapId}
                    swapBasicData={swapData}
                    refuel={refuel}
                />
            </WithdrawalProvider>
        }
    </>;
};
