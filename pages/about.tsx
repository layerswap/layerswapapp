import Head from 'next/head'
import Layout from '../components/layout'
import CardContainer from '../components/cardContainer'
import fs from 'fs'
import path from 'path'
import { serialize } from "next-mdx-remote/serialize";
import imageSize from "rehype-img-size";
import React from 'react'
import { MDXRemote } from 'next-mdx-remote'

export default function About(props) {
    return (
        <Layout>
            <Head>
                <title>About LayerSwap</title>
            </Head>

            <main>
                <div className="flex justify-center">
                    <CardContainer>
                        <div className="max-w-2xl mx-auto md:p-6 lg:p-16 prose prose-indigo">
                            <MDXRemote {...props.mdxSource} />
                        </div>
                    </CardContainer>
                </div>
            </main>

        </Layout>
    )
}

export async function getStaticProps() {
    const markdown = fs.readFileSync(path.join(process.cwd(), 'public/doc/aboutPage.md'), 'utf-8');
    const mdxSource = await serialize(markdown);
    return {
        props: {
            mdxSource
        },
    }
}