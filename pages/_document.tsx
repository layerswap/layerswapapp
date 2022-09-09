import { Html, Head, Main, NextScript } from 'next/document'
import { useQueryState } from '../context/query'

export default function Document() {

    return (
        <Html>
            <Head />
            <body className={``}>
                <Main />
                <NextScript />
            </body>
        </Html>
    )
}