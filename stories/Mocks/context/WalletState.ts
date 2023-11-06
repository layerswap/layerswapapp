import { WalletState } from "../../../context/wallet"

const WalletStateMock: WalletState = {
    balances: [],
    gases: {},
    imxAccount: null,
    isBalanceLoading: false,
    isGasLoading: false,
    starknetAccount: null,
    lprAccount: null,
    syncWallet: null
}

export default WalletStateMock