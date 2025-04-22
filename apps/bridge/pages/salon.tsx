import Layout from '../components/Layout'
import React from 'react'
import { InferGetServerSidePropsType } from 'next';
import { getServerSideProps } from '../helpers/getSettings';

export default function SalonPage({ settings, apiKey, themeData }: InferGetServerSidePropsType<typeof getServerSideProps>) {

    return (
        <Layout settings={settings}>
            <div>
                Salon
            </div>
        </Layout>
    )
}

export { getServerSideProps };