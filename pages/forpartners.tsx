import Head from 'next/head'
import Layout from '../components/layout'
import slug from 'rehype-slug'
import fs from 'fs'
import path from 'path'
import { serialize } from "next-mdx-remote/serialize";
import React, { useCallback } from 'react'
import { MDXRemote } from 'next-mdx-remote'
import imageSize from "rehype-img-size";
import LayerSwapApiClient from '../lib/layerSwapApiClient'
import { CryptoNetwork } from '../Models/CryptoNetwork'
import { Exchange } from '../Models/Exchange'
import NetworkSettings from '../lib/NetworkSettings'
import { ArrowLeftIcon } from '@heroicons/react/solid'
import { useRouter } from 'next/router'
import GoHomeButton from '../components/utils/GoHome'
import LayerswapMenu from '../components/LayerswapMenu'

export default function ForPartners(props) {
    const router = useRouter();

    const handleGoBack = useCallback(() => {
        router.back()
    }, [router])

    return (
        <Layout>
            <div className="flex content-center items-center justify-center mb-5 space-y-5 flex-col  container mx-auto sm:px-6 lg:px-8 max-w-3xl">
                <Head>
                    <title>Layerswap Partners</title>
                </Head>
                <main>
                    <div className="flex-col justify-center py-4 px-8 md:px-0 ">
                        <div className="mt-3 flex items-center justify-between z-20" >
                            <div className="flex ">
                                <button onClick={handleGoBack} className="self-start md:mt-2">
                                    <ArrowLeftIcon className='h-5 w-5 text-primary-text hover:text-darkblue-500 cursor-pointer' />
                                </button>
                            </div>
                        </div>
                        <div className="prose md:prose-xl text-primary-text">
                            <MDXRemote {...props.mdxSource} />
                        </div>
                        <p id='bottom' className='text-white text-lg md:text-xl text-left font-bold my-10'>Available values for the destNetwork parameter</p>
                        <div>
                            <div className="mt-8 flex flex-col">
                                <div className="-my-2 -mx-4 overflow-x-auto sm:-mx-6 lg:-mx-8">
                                    <div className="inline-block min-w-full py-2 align-middle md:px-6 lg:px-8">
                                        <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
                                            <table className="min-w-full divide-y divide-darkblue-500">
                                                <thead className="bg-darkblue-200">
                                                    <tr>
                                                        <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-primary-text sm:pl-6">
                                                            Network Name
                                                        </th>
                                                        <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-primary-text">
                                                            Query parameter value
                                                        </th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-darkblue-700 bg-darkblue-300">
                                                    {props?.networks?.map((n) => (
                                                        <tr key={n.display_name}>
                                                            <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm text-white font-medium sm:pl-6">
                                                                {n.display_name}
                                                            </td>
                                                            <td className="whitespace-nowrap px-3 py-4 text-sm text-white italic">{n.internal_name}</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <p id='bottom2' className='text-white text-lg md:text-xl text-left font-bold my-10'>Available values for the sourceExchangeName parameter</p>
                        <div>
                            <div className="mt-8 flex flex-col">
                                <div className="-my-2 -mx-4 overflow-x-auto sm:-mx-6 lg:-mx-8">
                                    <div className="inline-block min-w-full py-2 align-middle md:px-6 lg:px-8">
                                        <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
                                            <table className="min-w-full divide-y divide-darkblue-500">
                                                <thead className="bg-darkblue-200">
                                                    <tr>
                                                        <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-primary-text sm:pl-6">
                                                            Exchange Name
                                                        </th>
                                                        <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-primary-text">
                                                            Query parameter value
                                                        </th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-darkblue-700 bg-darkblue-300">
                                                    {props?.exchanges?.map((e) => (
                                                        <tr key={e.display_name}>
                                                            <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm text-white font-medium sm:pl-6">
                                                                {e.display_name}
                                                            </td>
                                                            <td className="whitespace-nowrap px-3 py-4 text-sm text-white italic">{e.internal_name}</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </main>
            </div>
        </Layout>
    )
}

export async function getStaticProps() {
    const markdown = fs.readFileSync(path.join(process.cwd(), 'public/doc/forPartners.md'), 'utf-8');
    const mdxSource = await serialize(markdown, {
        mdxOptions: {
            rehypePlugins: [slug, [imageSize, { dir: "public" }]],
        },
    });
    var apiClient = new LayerSwapApiClient();
    const response = await apiClient.fetchSettingsAsync()
    var networks: CryptoNetwork[] = [];
    var exchanges: Exchange[] = [];
    networks = response.data.networks.filter(n => n.status !== "inactive");
    exchanges = response.data.exchanges.filter(e => e.status !== "inactive" && !NetworkSettings.KnownSettings[e?.internal_name]?.ForceDisable)

    return {
        props: {
            mdxSource,
            networks,
            exchanges
        },
    }
}