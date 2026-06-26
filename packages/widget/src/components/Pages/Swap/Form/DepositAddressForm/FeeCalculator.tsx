import { Dispatch, FC, SetStateAction, memo, useState } from "react";
import { ArrowDown } from "lucide-react";
import { Network, Token } from "@/Models/Network";
import { useQuoteData } from "@/hooks/useFee";
import NumFlowWithFallback from "@/components/Common/NumFlowWithFallback";
import TokenChainBadge from "@/components/Pages/Deposit/_shared/TokenChainBadge";
import VaulDrawer from "@/components/Modal/vaulModal";

type FeeCalculatorProps = {
    show: boolean;
    setShow: Dispatch<SetStateAction<boolean>>;
    sourceNetwork: Network | undefined;
    sourceToken: Token | undefined;
    destinationNetwork: Network | undefined;
    destinationToken: Token | undefined;
    refuel: boolean;
};

// Local input sanitizer — keeps digits and a single decimal separator.
const sanitizeAmount = (raw: string): string => {
    let v = raw.replace(',', '.').replace(/[^0-9.]/g, '');
    const firstDot = v.indexOf('.');
    if (firstDot !== -1) {
        v = v.slice(0, firstDot + 1) + v.slice(firstDot + 1).replace(/\./g, '');
    }
    return v;
};

const RouteChip = memo(({ network, token }: { network: Network | undefined; token: Token | undefined }) => {
    if (!token || !network) return null;
    return (
        <span className="flex items-center gap-2 shrink-0 min-w-0">
            <TokenChainBadge
                tokenLogo={token.logo}
                tokenSymbol={token.symbol}
                networkLogo={network.logo}
                networkName={network.display_name}
                size={28}
            />
            <span className="flex flex-col min-w-0 max-w-[110px]">
                <span className="text-sm font-semibold text-primary-text leading-tight">{token.symbol}</span>
                <span className="text-xs font-normal text-secondary-text leading-tight truncate">{network.display_name}</span>
            </span>
        </span>
    );
});

const FeeCalculator: FC<FeeCalculatorProps> = ({
    show,
    setShow,
    sourceNetwork,
    sourceToken,
    destinationNetwork,
    destinationToken,
    refuel,
}) => {
    const [amount, setAmount] = useState('');

    const { quote, isQuoteLoading, isDebouncing } = useQuoteData(
        {
            from: sourceNetwork?.name,
            to: destinationNetwork?.name,
            fromCurrency: sourceToken?.symbol,
            toCurrency: destinationToken?.symbol,
            amount,
            refuel,
            depositMethod: 'deposit_address',
        },
        { skipLimits: true },
    );

    const receiveAmount = quote?.quote?.receive_amount;
    const hasAmount = !!amount && Number(amount) > 0;
    const isLoading = hasAmount && (isQuoteLoading || isDebouncing);
    const showReceive = hasAmount && receiveAmount !== undefined;

    return (
        <VaulDrawer
            show={show}
            setShow={setShow}
            modalId="fee-calculator"
            header={<span>Fee calculator</span>}
            onClose={() => setAmount('')}
        >
            <VaulDrawer.Snap id="item-1">
                <div className="flex flex-col gap-2 relative">
                    {/* Direction indicator centered over the gap between the cards */}
                    <div
                        aria-hidden="true"
                        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10 text-secondary-text"
                    >
                        <ArrowDown className="w-8 h-auto p-1.5 bg-secondary-300 rounded-xl ring-4 ring-secondary-700" />
                    </div>

                    {/* You transfer */}
                    <div className="bg-secondary-500 rounded-2xl p-4">
                        <label htmlFor="fee-calc-transfer" className="block text-secondary-text text-sm mb-1">
                            You transfer
                        </label>
                        <div className="flex items-center justify-between gap-2">
                            <input
                                id="fee-calc-transfer"
                                inputMode="decimal"
                                autoComplete="off"
                                autoCorrect="off"
                                placeholder="0.00"
                                value={amount}
                                onChange={(e) => setAmount(sanitizeAmount(e.target.value))}
                                className="min-w-0 flex-1 bg-transparent border-0 p-0 text-[28px] h-[42px] leading-7 text-primary-text placeholder:text-secondary-text focus:outline-none focus:ring-0"
                            />
                            <RouteChip network={sourceNetwork} token={sourceToken} />
                        </div>
                    </div>

                    {/* You receive */}
                    <div className="bg-secondary-500 rounded-2xl p-4">
                        <label className="block text-secondary-text text-sm mb-1">
                            You receive
                        </label>
                        <div className="flex items-center justify-between gap-2">
                            <div
                                className={`min-w-0 flex-1 text-[28px] h-[42px] truncate ${showReceive ? 'text-primary-text' : 'text-secondary-text'} ${isLoading ? 'animate-pulse-stronger' : ''}`}
                            >
                                {showReceive ? (
                                    <NumFlowWithFallback
                                        value={receiveAmount}
                                        trend={0}
                                        format={{ maximumFractionDigits: destinationToken?.decimals || 2 }}
                                    />
                                ) : (
                                    <span>0.00</span>
                                )}
                            </div>
                            <RouteChip network={destinationNetwork} token={destinationToken} />
                        </div>
                    </div>
                </div>
            </VaulDrawer.Snap>
        </VaulDrawer>
    );
};

export default FeeCalculator;
