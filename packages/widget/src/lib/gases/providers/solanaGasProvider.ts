// import { GasProps } from "../../../Models/Balance";
// import { Network, NetworkType } from "../../../Models/Network";
// import formatAmount from "../../formatAmount";
// import { Provider } from "./types";

// export class SolanaGasProvider implements Provider {
//     supportsNetwork(network: Network): boolean {
//         return network.type === NetworkType.Solana
//     }

//     getGas = async ({ address, network, token }: GasProps) => {
//         if (!address)
//             return
//         const { PublicKey, Connection } = await import("@solana/web3.js");

//         const walletPublicKey = new PublicKey(address)

//         const connection = new Connection(
//             `${network.node_url}`,
//             "confirmed"
//         );

//         if (!walletPublicKey) return

//         try {
//             const transactionBuilder = ((await import("../../wallets/solana/transactionBuilder")).default);

//             const transaction = await transactionBuilder(network, token, walletPublicKey)

//             if (!transaction || !network.token) return

//             const message = transaction.compileMessage();
//             const result = await connection.getFeeForMessage(message)

//             const formatedGas = formatAmount(result.value, network.token?.decimals)

//             return formatedGas
//         }
//         catch (e) {
//             console.log(e)
//         }
//     }
// }