import { HeliosProvider, init } from "./HeliosProvider.js";
import { ethers } from "https://cdnjs.cloudflare.com/ajax/libs/ethers/5.7.2/ethers.esm.min.js";
self.onmessage = (e) => {
    switch (e.data.type) {
        case 'init':
            getCommit(e.data.payload.data.commitConfigs);
            break;
        default:
            // Handle any cases that are not explicitly mentioned
            console.error('Unhandled message type:', e.data.type);
    }
};
async function getCommit(commitConfigs) {
    try {
        await init();

        const ethCheckpoint = await fetch(commitConfigs.hostname + '/api/getCheckpoint').then(res => res.json());
        const configEthereum = {
            executionRpc: "https://eth-sepolia.g.alchemy.com/v2/ErGCcrn6KRA91KfnRkqtyb3SJVdYGz1S",
            consensusRpc: commitConfigs.hostname + '/api/consensusRpc',
            checkpoint: ethCheckpoint?.data.finality.finalized.root || "0x5d7fbedda647649b940f099fe79832dc0b031b08e5558ff7371bcce472471ab4",
            dbType: "localstorage",
            network: 'sepolia'
        };
        const opstackConfigs = {
            executionRpc: "https://opt-mainnet.g.alchemy.com/v2/ErGCcrn6KRA91KfnRkqtyb3SJVdYGz1S",
            network: "op-mainnet",
        };
        const networkName = commitConfigs.network?.toLowerCase().includes('optimism') ? "opstack" : 'ethereum'

        const providerConfig = networkName === 'opstack' ? opstackConfigs : configEthereum;
        const heliosProvider = new HeliosProvider(providerConfig, networkName);
        await heliosProvider.sync();
        const web3Provider = new ethers.providers.Web3Provider(heliosProvider);
        const { abi, contractAddress, commitId } = commitConfigs;
        async function getCommitDetails(provider) {
            if (provider) {
                try {
                    const contract = new ethers.Contract(contractAddress, abi, web3Provider);
                    const res = await contract.getDetails(commitId);
                    return res;
                }
                catch (e) {
                    console.log(e);
                }
            }
        }
        let getDetailsHandler = undefined;
        (async () => {
            let attempts = 0;
            getDetailsHandler = setInterval(async () => {
                try {
                    if (attempts > 20) {
                        clearInterval(getDetailsHandler);
                        self.postMessage({ type: 'commitDetails', data: null });
                        return;
                    }

                    attempts++;
                    const data = await getCommitDetails(web3Provider);
                    if (data?.hashlock && data?.hashlock !== "0x0100000000000000000000000000000000000000000000000000000000000000" && data?.hashlock !== "0x0000000000000000000000000000000000000000000000000000000000000000") {
                        self.postMessage({ type: 'commitDetails', data: data });
                        clearInterval(getDetailsHandler);
                        return
                    }
                }
                catch (e) {
                    console.log(e);
                }
            }, 5000);
        })();
    } catch (e) {
        self.postMessage({ type: 'commitDetails', data: undefined });
        console.log(e);
    }

}
