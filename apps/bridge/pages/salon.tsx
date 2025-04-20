import Layout from '../components/Layout'
import React from 'react'
import { InferGetServerSidePropsType } from 'next';
import { getServerSideProps } from '../helpers/getSettings';
import { Salon } from '@layerswap/widget'

export default function SalonPage({ settings, apiKey, themeData }: InferGetServerSidePropsType<typeof getServerSideProps>) {

    return (
        <Layout settings={settings}>
            <Salon settings={settings} apiKey={apiKey} themeData={themeData} />
        </Layout>
    )
}

export { getServerSideProps };