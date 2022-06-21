import Head from 'next/head'
import slug from 'rehype-slug'
import fs from 'fs'
import path from 'path'
import { serialize } from "next-mdx-remote/serialize";
import imageSize from "rehype-img-size";
import React from 'react'
import { MDXRemote } from 'next-mdx-remote'
import Layout from '../../../components/layout';
import matter from 'gray-matter';

const componentOverrides = {
    img: (props) => (
        <img {...props}></img>
    ),
};

export default function UserGuide({
    frontmatter: { title, date, cover_image },
    fileName,
    mdxSource,
}) {

    return (
        <Layout>
            <div className="flex content-center items-center justify-center mb-5 space-y-5 flex-col  container mx-auto sm:px-6 lg:px-8 max-w-3xl">
                <Head>
                    <title>{title}</title>
                </Head>
                <main>
                    <div className="flex justify-center">
                        <div className="py-4 px-8 md:px-0 prose md:prose-xl text-blueGray-300">
                            <MDXRemote {...mdxSource} components={componentOverrides} />
                        </div>
                    </div>
                </main>
            </div>
        </Layout>
    )
}

export async function getStaticProps({ params: { fileName } }) {
    const markdownWithMeta = fs.readFileSync(
        path.join(process.cwd(), 'public/doc/blog/guides', fileName + '.md'),
        'utf-8'
    )

    const { data: frontmatter, content } = matter(markdownWithMeta)

    const mdxSource = await serialize(content, {
        mdxOptions: {
            rehypePlugins: [slug, [imageSize, { dir: "public" }]],
        },
    });

    return {
        props: {
            frontmatter,
            fileName,
            mdxSource,
        },
    }
}

export async function getStaticPaths() {
    const files = fs.readdirSync(path.join('public/doc/blog/guides'));

    return {
        paths: files.map(filename => {
            return {
                params: {
                    fileName: filename.replace('.md', ''),
                }
            }
        }),
        fallback: false
    }
}