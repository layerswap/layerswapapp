import { BalancesState } from "../../../context/balances"

const BalancesStateMock: BalancesState = {
    balances: [],
    gases: {},
    isBalanceLoading: false,
    isGasLoading: false,
    syncWallet: null
}

export default BalancesStateMock