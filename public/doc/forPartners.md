## Layerswap Integration Guide

To integrate Layerswap in your wallet or app, direct users to Layerswap and customize the initial values by using query parameters.

Example: [Loopring & FTX.COM](https://www.layerswap.io/?destNetwork=LOOPRING_MAINNET&sourceExchangeName=ftxcom).

- *sourceExchangeName* - Pre-select the source exchange. Avilable values are: ***binance***, ***coinbase***, ***ftxcom***, ***ftxus***, ***huobi***, ***okex***, ***kucoin***, ***bitfinex***, ***bittrex global***, ***cdc exchange*** and ***kraken***.


- *destNetwork* - Pre-select the destination network(L2, sidechain etc.). Avilable values are at a <a href='#bottom'>bottom of a page</a>.
   
- *lockAddress = true* - To lock the provided address, to not allow user to change it.

- *lockNetwork = true* - To lock the provided network.

- *asset* - To pre-select the asset. NOTE: aviable assets depend on the selected network, for example, the asset **LRC** is only aviable in **LOOPRING** network. Avilable values are: ***ETH***, ***USDC***, ***USDT*** and ***LRC***.

- [Full template](https://www.layerswap.io/?destNetwork=zksync_mainnet&destAddress=zksync%3A0x4d70500858f9705ddbd56d007d13bbc92c9c67d1&lockNetwork=true&lockAddress=true&addressSource=argent&email=tantushyan2736%40gmail.com).

---

## Centralized exchange or L2/side-chain integration

If you want Layerswap to integrate your exchange or L2 you can reach out to hi@layerswap.io. Prerequisites for exchange integration are the availability of (free and instant) internal transactions and APIs to fetch deposit/withdrawal history. For L2 integrations, only the ability to transfer between accounts.

---

## Wallet Integration Source

If you're integrating Layerswap to your wallet, and want your users to see where their address is coming from, you can reach out to hi@layerswap.io and provide the assets and information shown to the user.

<img className='mx-auto' src="/images/argentIntegr.png" alt="Argent" width="500"/> 
<img className='mx-auto' src="/images/imTokenIntegr.png" alt="imToken" width="500"/>
<img className='mx-auto' src="/images/tokenPocketIntegr.png" alt="TokenPocket" width="500"/>

<h2 id='bottom'>Available values for the destNetwork parameter</h2>

| **Network Name**  | **Query Type**     |
| ----------------- | -----------------: |
| Loopring          | LOOPRING_MAINNET   |
| Zksync            | ZKSYNC_MAINNET     | 
| Arbitrum          | ARBITRUM_MAINNET   |
| Ronin             | RONIN_MAINNET      |
| Boba              | BOBA_MAINNET       | 
| Optimism          | OPTIMISM_MAINNET   |
| Polygon           | POLYGON_MAINNET    |
| Moonbeam          | MOONBEAM_MAINNET   | 
| Immutable X       | IMMUTABLEX_MAINNET |
| StarkNet          | STARKNET_MAINNET   |


