import init, { set_panic_hook, Beerus } from './beerus_web.js';
import * as Starknet from 'https://cdn.jsdelivr.net/npm/starknet@6.8.0';
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
        set_panic_hook();
        const config = JSON.stringify({
            ethereum_url: `https://eth-sepolia.g.alchemy.com/v2/${initConfigs.alchemyKey}`,
            gateway_url: 'https://alpha-sepolia.starknet.io',
            starknet_url: `https://starknet-sepolia.g.alchemy.com/starknet/version/rpc/v0_7/${initConfigs.alchemyKey}`
        });
        let beerus = await new Beerus(config, post);
        console.log('Beerus instance created');
        self.client = beerus;
        self.postMessage({ type: 'init', data: { initialized: true } });
    }
    catch (e) {
        self.postMessage({ type: 'init', data: { initialized: false } });
        console.log(e);
    }
}
async function getCommit(commitConfigs) {
    try {
        const { commitId, contractAddress } = commitConfigs;
        async function getCommitDetails() {
            try {
                const call = {
                    execute: {
                        calldata: [
                            "0x1",
                            "0x0"
                        ],
                        contract_address: '0x047e9bb930cd69fbf37d57dc168562c15224b5c82d2e7d55d185d7259553d43d',
                        entry_point_selector: "0x12c1391cfaa9ef9e9ca09ecc94bd018890bd054699849cb213e73508977b704"
                    }
                };
                const res = await starknetCall(call);
                debugger
                return res;
            }
            catch (e) {
                debugger
                console.log(e);
            }
        }
        let getDetailsHandler = undefined;
        (async () => {
            let attempts = 0;
            getDetailsHandler = setInterval(async () => {
                try {
                    if (attempts > 15) {
                        clearInterval(getDetailsHandler);
                        self.postMessage({ type: 'commitDetails', data: null });
                        return;
                    }
                    attempts++;
                    const data = await getCommitDetails();
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
    catch (e) {
        self.postMessage({ type: 'commitDetails', data: undefined });
        console.log(e);
    }
}
async function starknetCall(commitConfigs) {
    console.log('worker: ', commitConfigs);
    let request = commitConfigs;
    if (request.hasOwnProperty('state')) {
        try {
            let state = await self.client.get_state();
            return `{"id":${request.id},"result":${state}}`;
        }
        catch (e) {
            console.error(e);
            let error = sanitize(e.toString());
            return `{"id":${request.id},"error":"${error}"}`;
        }
    }
    else if (request.hasOwnProperty('execute')) {
        let req = JSON.stringify(request['execute']);
        try {
            let result = await self.client.execute(req);
            return `{"id":${request.id},"result":${result}}`;
        }
        catch (e) {
            console.error(e);
            let error = sanitize(e.toString());
            return `{"id":${request.id},"error":"${error}"}`;
        }
    }
    else {
        console.error('worker: unknown request: ', commitConfigs.data);
        return `{"id":${request.id},"error": "unknown request"}`;
    }
}
;
function post(url, body) {
    let call = method(body);
    let now = performance.now();
    const xhr = new XMLHttpRequest();
    xhr.open("POST", url, false);
    xhr.setRequestHeader("Content-Type", "application/json");
    xhr.send(body);
    let ms = performance.now() - now;
    if (xhr.status != 200) {
        console.error(`call to ${call} completed in ${ms} ms`);
        throw new Error(xhr.statusText);
    }
    console.debug(`call to ${call} completed in ${ms} ms`);
    return xhr.responseText;
}
function method(body) {
    try {
        let json = JSON.parse(body);
        return json.method;
    }
    catch (e) {
        return "unknown";
    }
}
function sanitize(s) {
    return s.split(/\r?\n/)[0]
        .replaceAll('\"', '\'')
        .replaceAll('\\\'', '\'');
}
