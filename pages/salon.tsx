import Head from 'next/head'
import Layout from '../components/layout'
import fs from 'fs'
import path from 'path'
import { serialize } from "next-mdx-remote/serialize";
import React from 'react'
import { MDXRemote } from 'next-mdx-remote'
import IntroCard from '../components/introCard';
import SpinIcon from '../components/icons/spinIcon';

export default function About() {
    return (
        <Layout>
            <div className="flex content-center items-center justify-center mb-5 space-y-5 flex-col  container mx-auto sm:px-6 lg:px-8 max-w-3xl">
                <div className='flex flex-col space-y-5'>
                    <div className={`flex items-center p-12 text-center bg-darkBlue text-white min-w-3xl shadow-card rounded-lg w-full overflow-hidden relative `}>
                        <span className="flex items-center pl-3 grow">
                            <SpinIcon className="animate-spin h-20 w-20 flex self-center grow" />
                        </span>
                    </div>
                    <IntroCard />
                </div>
            </div>
        </Layout>
    )
}
