import { HeliosProvider, init } from "./HeliosProvider.js";
import { ethers } from "https://cdnjs.cloudflare.com/ajax/libs/ethers/5.7.2/ethers.esm.min.js";
self.onmessage = (e) => {
    switch (e.data.type) {
        case 'init':
            const configEthereum = {
                executionRpc: "https://eth-sepolia.g.alchemy.com/v2/ErGCcrn6KRA91KfnRkqtyb3SJVdYGz1S",
                consensusRpc: 'http://unstable.sepolia.beacon-api.nimbus.team',
                checkpoint: "0x81f12a3e1ba2ce7559d61320705b44888a102ccaf8e590547440daad74a6512d",
                dbType: "localstorage"
            };
            const opstackConfigs = {
                executionRpc: "https://opt-mainnet.g.alchemy.com/v2/a--NIcyeycPntQX42kunxUIVkg6_ekYc",
                network: "op-mainnet",
            };
            const configs = e.data.payload.data.commitConfigs.network?.includes('optimism') ? opstackConfigs : configEthereum;
            getCommit(configs, e.data.payload.data.commitConfigs);
            break;
        default:
            // Handle any cases that are not explicitly mentioned
            console.error('Unhandled message type:', e.data.type);
    }
};
async function getCommit(providerConfig, commitConfigs) {
    await init();
    const heliosProvider = new HeliosProvider(providerConfig, commitConfigs.network?.includes('optimsim') ? "opstack" : 'ethereum');
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
        getDetailsHandler = setInterval(async () => {
            try {
                const data = await getCommitDetails(web3Provider);
                if (data?.hashlock && data?.hashlock !== "0x0100000000000000000000000000000000000000000000000000000000000000" && data?.hashlock !== "0x0000000000000000000000000000000000000000000000000000000000000000") {
                    self.postMessage({ type: 'commitDetails', data: data });
                    clearInterval(getDetailsHandler);
                }
            }
            catch (e) {
                console.log(e);
            }
        }, 5000);
    })();
}
