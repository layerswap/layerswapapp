import Head from 'next/head'
import Swap from '../components/swap/swapComponent'
import Layout from '../components/layout'
import CardContainer from '../components/cardContainer'
import fs from 'fs'
import path from 'path'
import { remark } from 'remark'
import html from 'remark-html'

export default function About({ htmlContentString }) {
    return (
        <Layout>
            <Head>
                <title>About LayerSwap</title>
                <link rel="icon" href="/favicon.ico" />
            </Head>

            <main>
                <CardContainer>
                    <div className="max-w-2xl mx-auto">
                        <div
                            className="prose"
                            dangerouslySetInnerHTML={{ __html: htmlContentString }}
                        />
                    </div>
                </CardContainer>
            </main>

        </Layout>
    )
}

export async function getStaticProps() {
    const aboutContent = fs.readFileSync(path.join(process.cwd(), 'public/doc/aboutPage.md'), 'utf-8');
    const htmlContent = await remark().use(html).process(aboutContent);
    const htmlContentString = htmlContent.toString();

    return {
        props: {
            htmlContentString
        },
    }
}