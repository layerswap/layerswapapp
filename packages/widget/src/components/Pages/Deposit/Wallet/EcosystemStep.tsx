import { FC, useMemo } from "react";
import clsx from "clsx";
import { ChevronRight } from "lucide-react";
import { useSettingsState } from "@/context/settings";
import useWallet from "@/hooks/useWallet";
import { useConnectModal } from "@/components/Wallet/WalletModal";
import { ResolveConnectorIcon } from "@/components/Icons/ConnectorIcons";
import { ImageWithFallback } from "@/components/Common/ImageWithFallback";
import { NetworkRoute, NetworkType } from "@/Models/Network";
import { WalletConnectionProvider } from "@/types/wallet";
import { useDepositStep } from "../depositStepContext";
import { useDepositWallet } from "./depositWalletContext";

type Ecosystem = {
    type: NetworkType;
    provider: WalletConnectionProvider;
    label: string;
    routes: NetworkRoute[];
};

const resolveProviderForRoutes = (
    routes: NetworkRoute[],
    providers: WalletConnectionProvider[],
): WalletConnectionProvider | undefined => {
    const names = routes.map(r => r.name);
    return providers.find(p =>
        names.some(n =>
            p.withdrawalSupportedNetworks?.includes(n) ||
            p.asSourceSupportedNetworks?.includes(n),
        ),
    );
};

const EcosystemStep: FC = () => {
    const { sourceRoutes } = useSettingsState();
    const { providers } = useWallet();
    const { connect } = useConnectModal();
    const { push } = useDepositStep();
    const { setSourceEcosystem } = useDepositWallet();

    // Group source routes by ecosystem (NetworkType) and keep only the ones we
    // can actually connect a wallet for.
    const ecosystems = useMemo<Ecosystem[]>(() => {
        const byType = (sourceRoutes || []).reduce<Record<string, NetworkRoute[]>>((acc, route) => {
            (acc[route.type] ||= []).push(route);
            return acc;
        }, {});

        return Object.entries(byType)
            .map(([type, routes]) => {
                const provider = resolveProviderForRoutes(routes, providers);
                if (!provider) return null;
                return {
                    type: type as NetworkType,
                    provider,
                    label: provider.name,
                    routes,
                };
            })
            .filter((e): e is Ecosystem => e !== null);
    }, [sourceRoutes, providers]);

    const handleSelect = async (ecosystem: Ecosystem) => {
        const connected = await connect(ecosystem.provider, { dismissible: true });
        if (!connected) return;
        setSourceEcosystem(ecosystem.type);
        push("wallet-source");
    };

    return (
        <div className="flex flex-col gap-2 w-full h-[400px]">
            <p className="shrink-0 text-secondary-text text-xs px-1 pt-0.5 mb-1">
                Select the ecosystem your wallet works with
            </p>
            <div className="flex flex-col gap-2 w-full flex-1 min-h-0 overflow-y-auto styled-scroll">
                {ecosystems.map(ecosystem => {
                    return (
                        <button
                            key={ecosystem.type}
                            type="button"
                            onClick={() => handleSelect(ecosystem)}
                            className={clsx(
                                "group/card flex items-center gap-3.5 w-full text-left rounded-2xl px-4 py-3.5 transition-colors",
                                "bg-secondary-500 hover:bg-secondary-400/70",
                                "border border-transparent hover:border-secondary-300",
                                "focus-visible:ring-2 focus-visible:ring-primary-500/60 focus-visible:outline-none",
                            )}
                        >
                            <div className="shrink-0 h-[46px] w-[46px] rounded-xl flex items-center justify-center border bg-secondary-700 border-secondary-400 overflow-hidden">
                                <ImageWithFallback
                                    src={ecosystem.provider.providerIcon}
                                    alt={ecosystem.label}
                                    width={28}
                                    height={28}
                                    className="h-7 w-7 rounded-full"
                                />
                            </div>
                            <span className="flex-1 min-w-0 text-primary-text text-base font-semibold truncate">
                                {ecosystem.label}
                            </span>
                            <ResolveConnectorIcon
                                connector={ecosystem.provider.id}
                                iconClassName="h-5 w-5 rounded-full border border-secodnary-400"
                                className="-space-x-2 flex shrink-0"
                            />
                            <ChevronRight className="h-5 w-5 text-primary-text-tertiary shrink-0" />
                        </button>
                    );
                })}
            </div>
        </div>
    );
};

export default EcosystemStep;
