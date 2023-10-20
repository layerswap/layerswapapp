import { AccountInfo, ChainId, ConnectorNames, GlobalAPI, generateKeyPair } from "@loopring-web/loopring-sdk";
import Web3 from "web3";
import { providers } from "ethers";

export async function signatureKeyPairMock(accInfo: AccountInfo, _web3: Web3, exchangeAddress: string) {
    global.ethereum = providers?.EtherscanProvider
    const eddsaKey = await generateKeyPair({
        web3: _web3,
        address: accInfo.owner,
        keySeed:
            !accInfo.keySeed && accInfo.keySeed == ''
                ? GlobalAPI.KEY_MESSAGE.replace(
                    '${exchangeAddress}',
                    exchangeAddress,
                ).replace('${nonce}', (accInfo.nonce - 1).toString())
                : accInfo.keySeed,
        walletType: ConnectorNames.MetaMask,
        chainId: ChainId.MAINNET,
    })
    return eddsaKey
}