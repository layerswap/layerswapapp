# How to transfer crypto from Binance, Coinbase to Arbitrum without gas fees

With LayerSwap, you can send crypto from your Binance or Coinbase account directly to the Arbitrum network without paying gas fees.
This guide will go step by step throught the whole process.

* Go to https://layerswap.io

![Swaping from crypto exchange to arbitrum](https://user-images.githubusercontent.com/11096006/135860987-5b2aabfe-e0d1-47e2-9c82-29d91f79ee37.png)

* Enter the **amount** you want to transfer to Arbitrum.
* Choose **crypto exchange** from which you want to initiate the transfer.
* Enter Aribtrum **address**.
* Click Swap now!

You will be redirected to Bransfer to complete your transfer. Create your Bransfer Account and connect the exchange you want to transfer from.

![Group 1 (12)](https://user-images.githubusercontent.com/11096006/135861149-4098a7df-3123-4488-896a-e631b5d2e80e.png)

### Create an account at Bransfer

1. Go to the registration page https://connect.bransfer.io/auth/register
1. Fill in email and password or login via Coinbase or Twitter.

![Group 1 (13)](https://user-images.githubusercontent.com/11096006/135861365-03dcc518-02e2-4062-8613-be9c22d37021.png)

### Connect crypto exchange account to Bransfer

Go to Bransfer payment methods https://connect.bransfer.io/paymentmethods

![Group 4 (2)](https://user-images.githubusercontent.com/11096006/135861859-81d8c638-2598-4e5d-a2bc-f89553ddf151.png)

> Bransfer is using your crypto exchange accounts as "payment method". As PayPal is using your VISA or MasterCard.
> Different crypto exchanges provide different ways of integration. For Example with Coinbase it's simple as clicking Authorize button.
> But for example with Binance you have to put your API Keys. And for this reason we ask only for Read-only API keys.
> You will initate withdrawal manually and we will use read-only api keys to verify your withdrawal information and match with our records. 
> Right now we are working on more robust integration with Binance, which will allow to pay directly from Binance Pay App.

### Connect Coinbase

1. Click Connect next to Coinbase
1. In Coinbase Authorization screen configure limits and click Authorize

![Group 5 (3)](https://user-images.githubusercontent.com/11096006/135862279-0931cd11-a5b5-42b2-9a4e-746fae99d058.png)

### Connect Binance

1. Go to Binance and create read-only API keys. https://www.binance.com/en/support/faq/360002502072
1. Copy API and Secret Key

![Group 6 (4)](https://user-images.githubusercontent.com/11096006/135862887-ad89cd26-c538-4e32-a2a1-f057178c6c70.png)

1. Go to Bransfer payment methods https://connect.bransfer.io/paymentmethods
1. Click Connect next to Binance
1. Paste newly copied keys and click Connect.

![Group 7 (2)](https://user-images.githubusercontent.com/11096006/135863128-86d8703e-1614-4d64-897c-3279feb6e916.png)

**Now, you are ready to process your first no-fee and instant crypto transfer with Bransfer!**

After finishing the setup of your Bransfer account verify that transfer information is correct and click confirm. 

![Group 8 (3)](https://user-images.githubusercontent.com/11096006/135863978-c301f424-4176-450b-99f0-bec716e2da39.png)

In case of Coinbase, your payment will be automatically processed.

In case of Binance, you will see this screen.

![Group 9 (1)](https://user-images.githubusercontent.com/11096006/135864289-a9a0abe2-20f1-4fc1-af95-a374786704c8.png)

Go back to your Binance account and initate withdrawal to provided address and with exact amount. As the address provided is from Binance as well, there will be 0 fees (fees will be returned back your account).

After confirmation, your Arbitrum transaction will be published and you will receive the amount into your account in few seconds.
