import { BalancesStateUpdate } from "../../../context/balances"

const MockFunctions: BalancesStateUpdate = {
    getBalance: () => { throw new Error("Not implemented") },
    getGas: () => { throw new Error("Not implemented") },
}

export default MockFunctions