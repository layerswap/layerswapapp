## How to transfer crypto from Binance, Coinbase to Arbitrum without gas fees?

With LayerSwap, you can send crypto from your Binance or Coinbase account directly to the Arbitrum network without paying gas fees.
This guide will go step by step throught the whole process.

- Go to [layerswap.io](https://layerswap.io)

![Swap usdt from binance and coinbase to arbitrum](/images/layerswap_swap.png)

- Enter the **amount** you want to transfer to Arbitrum.
- Choose **crypto exchange** from which you want to initiate the transfer.
- Enter Aribtrum **address**.
- Click Swap now!

You will be redirected to Bransfer to complete your transfer. Create your Bransfer Account and connect the exchange you want to transfer from.

![Choose exchange to transfer from](/images/bransfer_choose_exchange.png)

### Create an account at Bransfer

1. Go to the [registration page](https://connect.bransfer.io/auth/register)
1. Fill in email and password or login via Coinbase or Twitter.

![Create Bransfer account](/images/bransfer_registration.png)

### Connect crypto exchange account to Bransfer

Go to Bransfer [payment methods](https://connect.bransfer.io/paymentmethods)

![Attach payment method](/images/bransfer_payment_methods.png)

> Bransfer is using your crypto exchange accounts as "payment method". As PayPal is using your VISA or MasterCard.
> Different crypto exchanges provide different ways of integration. For Example with Coinbase it's simple as clicking Authorize button.
> But for example with Binance you have to put your API Keys. And for this reason we ask only for Read-only API keys.
> You will initate withdrawal manually and we will use read-only api keys to verify your withdrawal information and match with our records.
> Right now we are working on more robust integration with Binance, which will allow to pay directly from Binance Pay App.

### Connect Coinbase

1. Click Connect next to Coinbase
1. In Coinbase Authorization screen configure limits and click Authorize

![Connect Coinbase to Bransfer](/images/coinbase_authorize.png)

> Note that you have to authorize for amount you are going to swap.

### Connect Binance

1. Go to Binance and [create read-only API keys](https://www.binance.com/en/support/faq/360002502072)
1. Copy API and Secret Key

![Copy Binance api key and secret](/images/binance_api_keys.png)

1. Go to Bransfer [payment methods](https://connect.bransfer.io/paymentmethods)
1. Click Connect next to Binance
1. Paste newly copied keys and click Connect.

![Connect Binance to Bransfer](/images/binance_connect_bransfer.png)

> Note that it's Read-Only API Keys. Bransfer WONT and CANT initate any trade or withdrawal on your behalf.

**Now, you are ready to process your first no-fee and instant crypto transfer with Bransfer!**

After finishing the setup of your Bransfer account verify that transfer information is correct and click confirm.

![Transfer confirmation](/images/transfer_confirmation.png)

In case of Coinbase, your payment will be automatically processed.

In case of Binance, you will see this screen.

![Binance payment confirmation](/images/binance_payment_processing.png)

Go back to your Binance account and initate withdrawal to provided address and with exact amount. As the address provided is from Binance as well, there will be 0 fees (fees will be returned back your account).

After confirmation, your Arbitrum transaction will be published and you will receive the amount into your account in few seconds.

![Swap success page](/images/swap_success.png)
