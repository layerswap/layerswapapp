import Head from 'next/head'
import Layout from '../components/layout'
import slug from 'rehype-slug'
import fs from 'fs'
import path from 'path'
import { serialize } from "next-mdx-remote/serialize";
import imageSize from "rehype-img-size";
import React from 'react'
import { MDXRemote } from 'next-mdx-remote'
import Link from 'next/link'
import Image from 'next/image'

const componentOverrides = {
    img: (props) => (
        <img {...props}></img>
    ),
    a: (props) => (
        (<Link {...props}>

        </Link>)
    )
};

const exchanges = [
    {
        name: 'Binance',
        imageSrc: 'https://bransferstorage.blob.core.windows.net/layerswap/exchanges/medium/binance.png',
        guideUrl: '/blog/guide/How_to_transfer_crypto_from_Binance_to_L2'
    },
    {
        name: 'Coinbase',
        imageSrc: 'https://bransferstorage.blob.core.windows.net/layerswap/exchanges/medium/coinbase.png',
        guideUrl: '/blog/guide/How_to_transfer_crypto_from_Coinbase_to_L2',
    },
    {
        name: 'FTX US',
        imageSrc: 'https://bransferstorage.blob.core.windows.net/layerswap/exchanges/medium/ftxus.png',
        guideUrl: '/blog/guide/How_to_transfer_crypto_from_FTX_US_to_L2',
    },
    {
        name: 'Huobi',
        imageSrc: 'https://bransferstorage.blob.core.windows.net/layerswap/exchanges/medium/huobi.png',
        guideUrl: '/blog/guide/How_to_transfer_crypto_from_Huobi_to_L2',
    },
    {
        name: 'KuCoin',
        imageSrc: 'https://bransferstorage.blob.core.windows.net/layerswap/exchanges/medium/kucoin.png',
        guideUrl: '/blog/guide/How_to_transfer_crypto_from_KuCoin_to_L2',
    },
    {
        name: 'FTX COM',
        imageSrc: 'https://bransferstorage.blob.core.windows.net/layerswap/exchanges/medium/ftxcom.png',
        guideUrl: '/blog/guide/How_to_transfer_crypto_from_FTX_COM_to_L2',
    },
    {
        name: 'Okex',
        imageSrc: 'https://bransferstorage.blob.core.windows.net/layerswap/exchanges/medium/okex.png',
        guideUrl: '/blog/guide/How_to_transfer_crypto_from_Okex_to_L2',
    },
    {
        name: 'Bitfinex',
        imageSrc: 'https://bransferstorage.blob.core.windows.net/layerswap/exchanges/medium/bitfinex.png',
        guideUrl: '/blog/guide/How_to_transfer_crypto_from_Bitfinex_to_L2',
    },
    {
        name: 'Kraken',
        imageSrc: 'https://bransferstorage.blob.core.windows.net/layerswap/exchanges/medium/kraken.png',
        guideUrl: '/blog/guide/How_to_transfer_crypto_from_Kraken_to_L2',
    },
    {
        name: 'crypto.com',
        imageSrc: 'https://bransferstorage.blob.core.windows.net/layerswap/exchanges/medium/cryptocom.png',
        guideUrl: '/blog/guide/How_to_transfer_crypto_from_cryptocom_to_L2',
    },
    ,
    {
        name: 'Bittrex Global',
        imageSrc: 'https://bransferstorage.blob.core.windows.net/layerswap/exchanges/medium/bittrexglobal.png',
        guideUrl: '/blog/guide/How_to_transfer_crypto_from_BITTREX_GLOBAL_to_L2',
    }
]

export default function UserGuide(props) {

    return (
        <Layout>
            <div className="flex content-center items-center justify-center mb-5 space-y-5 flex-col  container mx-auto sm:px-6 lg:px-8 max-w-3xl">
                <Head>
                    <title>Layerswap User Guide</title>
                </Head>
                <main>
                    <div className="flex justify-center">
                        <div className="py-4 px-8 md:px-0 prose md:prose-xl text-primary-text">
                            <MDXRemote {...props.mdxSource} components={componentOverrides} />
                        </div>
                    </div>
                    <div className="mx-auto px-8 pb-20 max-w-xl md:max-w-3xl">
                        <ul role="list" className="space-y-4 sm:grid sm:grid-cols-2 sm:gap-6 sm:space-y-0 lg:grid-cols-3 lg:gap-8">
                            {exchanges.map((exchange) => (
                                <Link href={exchange.guideUrl} key={exchange.name} legacyBehavior>
                                    <li key={exchange.name} className="py-6 md:py-10 px-4 md:px-6 bg-gray-800 text-center rounded-lg xl:px-10 hover:cursor-pointer hover:bg-gray-600">
                                        <div className="space-y-2 md:space-y-6 xl:space-y-10">
                                            <Image
                                                height="100"
                                                width="100"
                                                layout="fixed"
                                                className="mx-auto rounded-md"
                                                src={exchange.imageSrc}
                                                alt="" />
                                            <div className="font-medium text-lg leading-6 space-y-1">
                                                <h3 className="text-white">{exchange.name}</h3>
                                            </div>
                                        </div>
                                    </li>
                                </Link>
                            ))}
                        </ul>
                    </div>
                </main>
            </div>
        </Layout>
    );
}

export async function getStaticProps() {
    const markdown = fs.readFileSync(path.join(process.cwd(), 'public/doc/userGuide.md'), 'utf-8');
    const mdxSource = await serialize(markdown, {
        mdxOptions: {
            rehypePlugins: [slug, [imageSize, { dir: "public" }]],
        },
    });

    return {
        props: {
            mdxSource
        },
    }
}