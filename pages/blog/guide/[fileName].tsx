import Head from 'next/head'
import slug from 'rehype-slug'
import fs from 'fs'
import path from 'path'
import { serialize } from "next-mdx-remote/serialize";
import imageSize from "rehype-img-size";
import React, { useCallback } from 'react'
import { MDXRemote } from 'next-mdx-remote'
import Layout from '../../../components/layout';
import matter from 'gray-matter';
import { useRouter } from 'next/router';
import { ArrowLeftIcon } from '@heroicons/react/solid';
import HeaderWithMenu from '../../../components/HeaderWithMenu';
import { AuthProvider } from '../../../context/authContext';
import { MenuProvider } from '../../../context/menu';

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
    const router = useRouter();

    const handleGoBack = useCallback(() => {
        router.back()
    }, [router])

    return (
        <Layout>
            <div className="bg-darkblue shadow-card rounded-lg w-full flex content-center items-center justify-center mb-5 space-y-5 flex-col  container mx-auto max-w-3xl">
                <Head>
                    <title>{title}</title>
                </Head>
                <main>
                    <AuthProvider>
                        <MenuProvider>
                            <HeaderWithMenu goBack={handleGoBack} />
                        </MenuProvider>
                    </AuthProvider>
                    <div className="flex-col justify-center py-4 px-8 md:px-0 sm:px-6 lg:px-8">
                        <div className="py-4 px-8 md:px-0 prose md:prose-xl text-primary-text">
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