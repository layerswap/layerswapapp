# How to transfer crypto from Binance, Coinbase to Arbitrum without gas fees?

With LayerSwap, you can send crypto from your Binance or Coinbase account directly to the Arbitrum network without paying gas fees.
This guide will go step by step throught the whole process.

* Go to https://layerswap.io

![Swap usdt from binance and coinbase to arbitrum](https://user-images.githubusercontent.com/11096006/136033467-e6e83dcf-a5fe-4867-8b9b-ad978efd655e.png)

* Enter the **amount** you want to transfer to Arbitrum.
* Choose **crypto exchange** from which you want to initiate the transfer.
* Enter Aribtrum **address**.
* Click Swap now!

You will be redirected to Bransfer to complete your transfer. Create your Bransfer Account and connect the exchange you want to transfer from.

![Choose exchange to transfer from](https://user-images.githubusercontent.com/11096006/136033823-aa3ce5cf-1800-41fa-a9b7-316ea4ea318e.png)


### Create an account at Bransfer

1. Go to the registration page https://connect.bransfer.io/auth/register
1. Fill in email and password or login via Coinbase or Twitter.

![Create Bransfer account](https://user-images.githubusercontent.com/11096006/136033969-1678e985-76e3-4e0d-b319-12ac7aed0d85.png)

### Connect crypto exchange account to Bransfer

Go to Bransfer payment methods https://connect.bransfer.io/paymentmethods

![Attach payment method](https://user-images.githubusercontent.com/11096006/136034115-467e1d0a-d364-4ca3-858c-0662272e14aa.png)


> Bransfer is using your crypto exchange accounts as "payment method". As PayPal is using your VISA or MasterCard.
> Different crypto exchanges provide different ways of integration. For Example with Coinbase it's simple as clicking Authorize button.
> But for example with Binance you have to put your API Keys. And for this reason we ask only for Read-only API keys.
> You will initate withdrawal manually and we will use read-only api keys to verify your withdrawal information and match with our records. 
> Right now we are working on more robust integration with Binance, which will allow to pay directly from Binance Pay App.

### Connect Coinbase

1. Click Connect next to Coinbase
1. In Coinbase Authorization screen configure limits and click Authorize

![Connect Coinbase to Bransfer](https://user-images.githubusercontent.com/11096006/136034442-65e2f96c-376a-4fca-9ae9-b705a399dcd0.png)

### Connect Binance

1. Go to Binance and (create read-only API keys)[https://www.binance.com/en/support/faq/360002502072]. 
1. Copy API and Secret Key

![Copy Binance api key and secret](https://user-images.githubusercontent.com/11096006/136034366-4123948b-9f8a-446f-947e-b441930ffbdc.png)

1. Go to Bransfer payment methods https://connect.bransfer.io/paymentmethods
1. Click Connect next to Binance
1. Paste newly copied keys and click Connect.

![Connect Binance to Bransfer](https://user-images.githubusercontent.com/11096006/136034263-91634bad-729e-480d-bd78-bece25c429f5.png)

**Now, you are ready to process your first no-fee and instant crypto transfer with Bransfer!**

After finishing the setup of your Bransfer account verify that transfer information is correct and click confirm. 

![Transfer confirmation](https://user-images.githubusercontent.com/11096006/136034570-9b47f2a8-889a-4cf4-abab-da52a5fba307.png)

In case of Coinbase, your payment will be automatically processed.

In case of Binance, you will see this screen.

![Binance payment confirmation](https://user-images.githubusercontent.com/11096006/136034694-c27b0108-a24b-4861-b9a9-60d6cf7e4ad7.png)

Go back to your Binance account and initate withdrawal to provided address and with exact amount. As the address provided is from Binance as well, there will be 0 fees (fees will be returned back your account).

After confirmation, your Arbitrum transaction will be published and you will receive the amount into your account in few seconds.

![Swap success page](https://user-images.githubusercontent.com/11096006/136034802-6978f4a5-9718-4d6a-a057-6ea88efba3c4.png)

