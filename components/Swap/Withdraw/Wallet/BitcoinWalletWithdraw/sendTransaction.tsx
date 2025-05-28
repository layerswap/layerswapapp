export const sendUTXOTransaction = async (nodeUrl: string, txHex: string) => {
    
    const payload = {
        jsonrpc: "2.0",
        method: 'sendrawtransaction',
        params: [txHex],
        id: 1,
    };

    const response = await fetch(nodeUrl, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
    });
    const txHash = (await response.json()).result;

    return txHash;
} 