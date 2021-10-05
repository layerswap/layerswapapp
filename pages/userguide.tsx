import Head from 'next/head'
import Layout from '../components/layout'
import CardContainer from '../components/cardContainer'
import fs from 'fs'
import path from 'path'
import { remark } from 'remark'
import html from 'remark-html'

export default function UserGuide({ htmlContentString }) {
    return (
        <Layout>
            <Head>
                <title>LayerSwap User Guide</title>
            </Head>

            <main>
                <div className="flex justify-center">
                    <CardContainer>
                        <div className="max-w-2xl mx-auto p-16">
                            <div
                                className="prose"
                                dangerouslySetInnerHTML={{ __html: htmlContentString }}
                            />
                        </div>
                    </CardContainer>
                </div>
            </main>

        </Layout>
    )
}

export async function getStaticProps() {
    const aboutContent = fs.readFileSync(path.join(process.cwd(), 'public/doc/userGuide.md'), 'utf-8');
    const htmlContent = await remark().use(html).process(aboutContent);
    const htmlContentString = htmlContent.toString();

    return {
        props: {
            htmlContentString
        },
    }
}