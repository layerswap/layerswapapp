import React, { use, useEffect, useState } from 'react';
import { MessageSquareText, SearchIcon } from "lucide-react";
import SubmitButton from '../components/buttons/submitButton';
import QuestionIcon from '../components/icons/Question';
import { useIntercom } from 'react-use-intercom';
import Head from "next/head"
import { useRouter } from 'next/router';
import GlobalFooter from '../components/globalFooter';
import Navbar from '../components/navbar';

export default function Home() {
    const { boot, showMessages } = useIntercom()
    const router = useRouter();

    useEffect(() => {
        boot()
    }, [])

    const handleSupportWidgetOpen = () => {
        boot()
        showMessages();
    };
    const basePath = router?.basePath ?? ""

    return (
        <>

            <Head>
                <title>Layerswap</title>
                <link rel="apple-touch-icon" sizes="180x180" href={`${basePath}/favicon/apple-touch-icon.png`} />
                <link rel="icon" type="image/png" sizes="32x32" href={`${basePath}/favicon/favicon-32x32.png`} />
                <link rel="icon" type="image/png" sizes="16x16" href={`${basePath}/favicon/favicon-16x16.png`} />
                <link rel="manifest" href={`${basePath}/favicon/site.webmanifest`} />
                <meta name="msapplication-TileColor" content="#ffffff" />
                <meta name="theme-color" content={`rgb(var(--ls-colors-secondary-900))`} />
                <meta name="description" content="Move crypto across exchanges, blockchains, and wallets." />

                {/* Facebook Meta Tags */}
                <meta property="og:url" content={`https://www.layerswap.io/${basePath}`} />
                <meta property="og:type" content="website" />
                <meta property="og:title" content="Layerswap" />
                <meta property="og:description" content="Move crypto across exchanges, blockchains, and wallets." />
                <meta property="og:image" content={`https://layerswap.io/${basePath}/opengraph.jpg?v=2`} />

                {/* Twitter Meta Tags */}
                <meta name="twitter:card" content="summary_large_image" />
                <meta property="twitter:domain" content="layerswap.io" />
                <meta property="twitter:url" content={`https://www.layerswap.io/${basePath}`} />
                <meta name="twitter:title" content="Layerswap" />
                <meta name="twitter:description" content="Move crypto across exchanges, blockchains, and wallets." />
                <meta name="twitter:image" content={`https://layerswap.io/${basePath}/opengraphtw.jpg`} />
            </Head>
            <div className='flex flex-col items-center h-screen w-full space-y-8'>
                <Navbar />
                <div className={`p-6 bg-secondary-900 border-secondary-700 border-2  md:shadow-card rounded-xl w-full sm:overflow-hidden relative max-w-[500px] space-y-5`}>
                    <div>
                        <h1 className='text-4xl font-medium bg-gradient-to-r from-primary to-indigo-500 inline-block text-transparent bg-clip-text'>
                            Need help?
                        </h1>
                        <p className='text-secondary-text'>
                            Let's get your experience exceptional
                        </p>
                    </div>
                    <div className={`w-full flex flex-col gap-4 text-secondary-text h-full`}>
                        <div className='grid grid-cols-2 items-stretch gap-4'>
                            <div className='p-6 bg-secondary-700 rounded-lg flex flex-col justify-bewteen space-y-6 h-full'>
                                <p className='text-sm'>
                                    Have any questions? Our support team is just a click away
                                </p>
                                <button className='py-2 w-full bg-secondary-800 rounded-md font-medium' onClick={handleSupportWidgetOpen}>
                                    <div className='bg-gradient-to-r from-primary to-indigo-500 text-transparent bg-clip-text inline-flex items-center gap-1 justify-center'>
                                        {/* <MessageSquareText  className='stroke-2 w-6 h-6' /> */}
                                        <span>Contact Us</span>
                                    </div>
                                </button>
                            </div>
                            <div className='p-6 bg-secondary-700 rounded-lg flex flex-col justify-between h-full '>
                                <p className='text-sm'>
                                    See fequetly asked questions
                                </p>
                                <button type='button' className='py-2 w-full text-primary-text bg-secondary-800 rounded-md inline-flex items-center gap-1 justify-center font-medium'>
                                    <QuestionIcon className='stroke-2 w-6 h-6' strokeWidth={2} />
                                    <span>FAQ</span>
                                </button>
                            </div>
                        </div>

                        <div className='col-span-2 p-6 bg-secondary-700 rounded-lg space-y-3'>
                            <p className='text-secondary-text text-sm'>
                                You can also check the status of your transactions by searching on the explorer.
                            </p>
                            <Search />
                        </div>
                    </div>
                </div>
            </div>
            <GlobalFooter />

        </>

    );

}

const Search = () => {
    const [searchParam, setSearchParam] = useState('');

    const handleKeyDown = (event: any) => {
        if (event.key === 'Enter') {
            handleSearch()
        }
    }

    function getLastPart(url: string) {
        const parts = url.split('/');
        return parts.at(-1);
    }

    const handleSearch = () => {
        const url = getLastPart(searchParam)
        window.open(`https://www.layerswap.io/explorer/${encodeURIComponent(url || '')}`, '_blank')
    }

    return (
        <div className="w-full">
            <div className="relative flex items-center bg-secondary-700 rounded-md">
                <input
                    type="text"
                    name="searchParam"
                    id="searchParam"
                    value={searchParam}
                    onChange={(v) => setSearchParam(v.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Search by Address / Source Tx / Destination Tx"
                    className="block w-full rounded-md py-1 pl-3 pr-4 border-2 border-transparent placeholder:text-sm placeholder:leading-3 focus:border-secondary-500 duration-200 transition-all outline-none text-primary-text bg-secondary-800 shadow-sm placeholder:text-secondary-text "
                />
                <div className="flex p-2">
                    <button
                        onClick={handleSearch}
                        className="inline-flex items-center rounded-lg bg-primary-500 shadow-lg p-2 hover:brightness-125 hover:text-primary-text active:scale-90 duration-200 transition-all font-sans text-xs text-white"
                    >
                        <SearchIcon className="h-5 w-5" />
                    </button>
                </div>
            </div>
        </div>
    )
}