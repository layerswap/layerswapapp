import Head from 'next/head'
import Layout from '../components/layout'
import fs from 'fs'
import path from 'path'
import { serialize } from "next-mdx-remote/serialize";
import React from 'react'
import { MDXRemote } from 'next-mdx-remote'
import IntroCard from '../components/introCard';

export default function About() {
    return (
        <Layout>
            <div className="flex content-center items-center justify-center mb-5 space-y-5 flex-col  container mx-auto sm:px-6 lg:px-8 max-w-3xl">
                <div className='flex flex-col space-y-5'>
                    <div className={`p-12 text-center bg-darkBlue text-white min-w-3xl shadow-card rounded-lg w-full overflow-hidden relative `}>
                        Salon page
                    </div>
                    <IntroCard />
                </div>
            </div>
        </Layout>
    )
}
