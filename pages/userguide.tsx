import Head from 'next/head'
import Layout from '../components/layout'
import CardContainer from '../components/cardContainer'
import fs from 'fs'
import path from 'path'
import Image from 'next/dist/client/image'
import { serialize } from "next-mdx-remote/serialize";
import imageSize from "rehype-img-size";
import React from 'react'
import { MDXRemote } from 'next-mdx-remote'

const componentOverrides = {
    img: (props) => (
        <Image {...props} layout="responsive" quality="100"></Image>
    ),
};

export default function UserGuide(props) {

    return (
        <Layout>
            <Head>
                <title>LayerSwap User Guide</title>
            </Head>
            <main>
                <div className="flex justify-center">
                    <div className="py-10 lg:py-20 px-8 md:px-0 prose md:prose-xl text-white">
                        <MDXRemote {...props.mdxSource} components={componentOverrides} />
                    </div>
                </div>
            </main>
        </Layout>
    )
}

export async function getStaticProps() {
    const markdown = fs.readFileSync(path.join(process.cwd(), 'public/doc/userGuide.md'), 'utf-8');
    const mdxSource = await serialize(markdown, {
        mdxOptions: {
            rehypePlugins: [[imageSize, { dir: "public" }]],
        },
    });

    return {
        props: {
            mdxSource
        },
    }
}