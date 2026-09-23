import { useSwapDataState } from '../context/swap';
import { ResolvedSwapStatus } from '../components/utils/resolveSwapPhase';

// Zero-arity by design: the status is computed once in SwapDataProvider from every input
// (API swap, stored wallet tx, tx-status poll, gasless authorization), so all readers —
// the Processing panel, retry, deposit close locks and the flow_closed report — share one
// object. Any per-caller input channel would let them diverge.
export function useResolvedSwapStatus(): ResolvedSwapStatus {
    return useSwapDataState().resolved
}
