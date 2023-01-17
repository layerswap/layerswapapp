### Partnership Inquiries

If you have partnership offers or questions related to collaboration with Layerswap, please fill in <a href='https://t507xw0ywxn.typeform.com/to/hecTNbte#name=xxxxx' target='_blank'>this form</a> and we’ll be happy to talk to you.

---

### Layerswap Integration Guide

To integrate Layerswap in your wallet or app, direct users to Layerswap and customize the initial values by using query parameters.

Example: [Loopring & Coinbase](https://www.layerswap.io/?destNetwork=LOOPRING_MAINNET&sourceExchangeName=coinbase).

- *sourceExchangeName* - Pre-select the source exchange. Available values are at the <a href='#bottom2'>bottom of the page</a>.


- *destNetwork* - Pre-select the destination network(L2, sidechain etc.). Available values are at the <a href='#bottom'>bottom of the page</a>.
   
- *lockAddress = true* - To lock the provided address, to not allow user to change it.

- *lockNetwork = true* - To lock the provided network.

- *asset* - To pre-select the asset. NOTE: available assets depend on the selected network, for example, the asset **LRC** is only available in **LOOPRING** network. Avilable values are: ***ETH***, ***USDC***, ***USDT*** and ***LRC***.

- [Full template](https://www.layerswap.io/?destNetwork=zksync_mainnet&destAddress=zksync%3A0x4d70500858f9705ddbd56d007d13bbc92c9c67d1&lockNetwork=true&lockAddress=true&addressSource=argent&email=tantushyan2736%40gmail.com).

---

### Centralized exchange or L2/side-chain integration

If you want Layerswap to integrate your exchange or L2 you can reach out to hi@layerswap.io. Prerequisites are:
- exchange integration: availability of (free and instant) internal transactions and APIs to fetch deposit/withdrawal history
- L2 integrations: ability to transfer between accounts.

---

### Wallet Integration Source

If you're integrating Layerswap to your wallet, and want your users to see where their address is coming from, you can reach out to hi@layerswap.io and provide the assets and information shown to the user.

<img className='mx-auto' src="/images/argentIntegr.png" alt="Argent" width="500"/> 
<img className='mx-auto' src="/images/imTokenIntegr.png" alt="imToken" width="500"/>
<img className='mx-auto' src="/images/tokenPocketIntegr.png" alt="TokenPocket" width="500"/>