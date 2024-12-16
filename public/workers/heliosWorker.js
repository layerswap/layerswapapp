import { HeliosProvider, init } from "./HeliosProvider.js";
import { ethers } from "https://cdnjs.cloudflare.com/ajax/libs/ethers/5.7.2/ethers.esm.min.js";
self.onmessage = (e) => {
    switch (e.data.type) {
        case 'init':
            let configEthereum = {
                executionRpc: "https://eth-mainnet.g.alchemy.com/v2/a--NIcyeycPntQX42kunxUIVkg6_ekYc",
                checkpoint: "0x79da0a204d128661d3fb6538f0f1a25e13a08c680a3ec845c1c29d1fc6aa62aa",
                dbType: "localstorage"
            };
            getCommit(configEthereum, e.data.payload.data.commitConfigs);
            break;
        default:
            // Handle any cases that are not explicitly mentioned
            console.error('Unhandled message type:', e.data.type);
    }
};
async function getCommit(providerConfig, commitConfigs) {
    await init();
    const ethereumProvider = new HeliosProvider(providerConfig, "ethereum");
    await ethereumProvider.sync();
    const ethProvider = new ethers.providers.Web3Provider(ethereumProvider);
    const { abi, contractAddress, commitId } = commitConfigs;
    async function getCommitDetails(provider) {
        if (provider) {
            try {
                const contract = new ethers.Contract(contractAddress, abi, ethProvider);
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
                const data = await getCommitDetails(ethProvider);
                if (data.hashlock !== "0x0100000000000000000000000000000000000000000000000000000000000000" && data.hashlock !== "0x0000000000000000000000000000000000000000000000000000000000000000")  {
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
