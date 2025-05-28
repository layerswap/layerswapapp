export const sendUTXOTransaction = async (nodeUrl: string, txHex: string) => {

    const payload = {
        jsonrpc: "2.0",
        method: 'sendrawtransaction',
        params: [txHex],
        id: new Date().getTime(),
    };

    const response = await fetch(nodeUrl, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to send transaction: ${errorText}`);
    }

    const txHash = (await response.json()).result;

    return txHash;
} 