import { HeliosProvider, init } from "./HeliosProvider.js";
import { ethers } from "https://cdnjs.cloudflare.com/ajax/libs/ethers/5.7.2/ethers.esm.min.js";
self.onmessage = (e) => {
    switch (e.data.type) {
        case 'init':
            initWorker(e.data.payload.data.initConfigs);
            break;
        case 'getDetails':
            getCommit(e.data.payload.data.commitConfigs);
            break;
        default:
            // Handle any cases that are not explicitly mentioned
            console.error('Unhandled message type:', e.data.type);
    }
};
async function initWorker(initConfigs) {
    try {
        await init();
        // const ethCheckpoint = await fetch(initConfigs.hostname + '/api/getCheckpoint').then(res => res.json());
        const ethereumConfig = {
            executionRpc: `${initConfigs.version == 'sandbox' ? 'https://eth-sepolia.g.alchemy.com/v2/' : 'https://eth-mainnet.g.alchemy.com/v2/'}${initConfigs.alchemyKey}`,
            consensusRpc: initConfigs.version == 'sandbox' ? initConfigs.hostname + '/api/consensusRpc' : undefined,
            checkpoint: initConfigs.version == 'sandbox' ? '0x527a8a4949bc2128d73fa4e2a022aa56881b2053ba83c900013a66eb7c93343e' : '0xf5a73de5020ab47bb6648dee250e60d6f031516327f4b858bc7f3e3ecad84c40',
            dbType: "localstorage",
            network: initConfigs.version == 'sandbox' ? 'sepolia' : undefined
        };
        const opstackConfig = {
            executionRpc: `https://opt-mainnet.g.alchemy.com/v2/${initConfigs.alchemyKey}`,
            network: "op-mainnet",
        };
        const baseConfig = {
            executionRpc: `https://base-mainnet.g.alchemy.com/v2/${initConfigs.alchemyKey}`,
            network: "base",
        };
        const networkName = initConfigs.network?.toLowerCase().includes('ethereum') ? "ethereum" : 'opstack';
        const providerConfig = networkName === 'opstack' ? (initConfigs.network.toLowerCase().includes('base') ? baseConfig : opstackConfig) : ethereumConfig;
        const heliosProvider = new HeliosProvider(providerConfig, networkName);
        await heliosProvider.sync();
        self.web3Provider = new ethers.providers.Web3Provider(heliosProvider);
        self.postMessage({ type: 'init', data: { initialized: true } });
    }
    catch (e) {
        self.postMessage({ type: 'init', data: { initialized: false } });
        console.log(e);
    }
}
async function getCommit(commitConfigs) {
    try {
        const { abi, contractAddress, commitId } = commitConfigs;
        async function getCommitDetails(provider) {
            if (provider) {
                try {
                    const contract = new ethers.Contract(contractAddress, abi, provider);
                    const res = await contract.getHTLCDetails(commitId);
                    return res;
                }
                catch (e) {
                    console.log(e);
                }
            }
        }
        (async () => {
            for (let attempt = 0; attempt < 40; attempt++) {
                try {
                    if (attempt > 40) {
                        self.postMessage({ type: 'commitDetails', data: null });
                        return;
                    }
                    const data = await getCommitDetails(self.web3Provider);
                    if (data?.hashlock && data?.hashlock !== "0x0100000000000000000000000000000000000000000000000000000000000000" && data?.hashlock !== "0x0000000000000000000000000000000000000000000000000000000000000000") {
                        self.postMessage({ type: 'commitDetails', data: data });
                        return;
                    }
                }
                catch (e) {
                    console.log(e);
                }
                await sleep(5000);
            }
        })();
    }
    catch (e) {
        self.postMessage({ type: 'commitDetails', data: undefined });
        console.log(e);
    }
}
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
