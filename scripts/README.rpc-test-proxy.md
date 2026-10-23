# Wallet RPC timeout testing

Run from the repository root with Node 24. No dependencies or widget changes are required.

```sh
RPC_UPSTREAM='https://YOUR_EXISTING_RPC_URL' node scripts/rpc-test-proxy.mjs
```

Use the existing RPC URL for the chain you are testing. The proxy does not change chain IDs or sign transactions. It listens only on your computer. Use a test wallet and a supported testnet route when testing broadcasts.

1. Open **http://127.0.0.1:8547/** for the controls.
2. In your desktop wallet extension, edit the source network's RPC URL to **http://127.0.0.1:8547/rpc**. Keep its existing chain ID and currency. Select this RPC as the network's default.
3. Leave the proxy in pass-through while connecting the wallet and preparing the swap.
4. When the wallet confirmation opens, arm a fault in the control page with **Broadcasts only** selected. Confirm the transaction in the wallet.

## Modes

| Mode | Behavior | What it tests |
| --- | --- | --- |
| Timeout before forwarding | Returns a simulated JSON-RPC timeout without forwarding the matching request | Unknown status: no deposit should appear from this request |
| Forward, then return timeout | Forwards the request; if the node accepts it, replaces the response with a simulated timeout | The report's important case: the transaction may be sent despite the error |
| Forward, then delay response | Forwards normally, then holds the response for the configured delay | The wallet's actual transport timeout, if its deadline is shorter than the delay |

The last two modes **can broadcast a real transaction**. The first mode returns a simulated error; it does not create a real network timeout. Wallets may retry internally or recover the hash, so a single injected fault does not guarantee a visible wallet error. Use the request log to see what happened. If needed, uncheck **Only the next matching request** to apply faults throughout the armed window.

Reads remain normal with **Broadcasts only**. Select **All RPC methods** only when you deliberately want to test preparation/RPC-health failures as well.

**Pass through / release delayed responses** disables faults and immediately releases held replies. The armed window limits which new requests are affected; already-held replies retain their individual response delay until released.

## Expected widget behavior

- If the wallet surfaces a timeout, the widget shows its wallet warning. Swap progress continues through the existing background polling.
- With no recorded deposit, it keeps the wallet warning and normal **Try again** action. Only a deliberate click retries the wallet; the widget does not automatically resend.
- With a recorded deposit or advanced swap status, it resumes the existing swap's progress.
- Normal wallet-connection and RPC-health requirements apply to a manual retry. Existing backend polling can detect a deposit even while the wallet response is held.
- If the wallet returns a transaction hash despite the injected fault, normal progress is expected: that wallet recovered the response internally.

After testing, restore the wallet's original RPC URL, then stop the proxy with Ctrl+C. A mobile wallet cannot reach your computer through its own `127.0.0.1`; this setup is for a desktop wallet extension.

Optional port override: `RPC_PROXY_PORT=8548`. Controls and wallet RPC must use that port.

Run the proxy's tests with:

```sh
node --test scripts/rpc-test-proxy.test.mjs
```
