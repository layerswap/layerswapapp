import { WalletStateUpdate } from "../../../context/wallet"

const MockFunctions: WalletStateUpdate = {
    getBalance: () => { throw new Error("Not implemented") },
    getGas: () => { throw new Error("Not implemented") },
    setImxAccount: () => { throw new Error("Not implemented") },
    setStarknetAccount: () => { throw new Error("Not implemented") },
    setSyncWallet: () => { throw new Error("Not implemented") },
    setLprAccount: () => { throw new Error("Not implemented") }
}

export default MockFunctions