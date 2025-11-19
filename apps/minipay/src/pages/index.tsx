import { InferGetServerSidePropsType } from 'next'
import { getServerSideProps } from '../helpers/getSettings';
import { HomeComponent } from '@/components/HomeComponent';

export default function Home({ settings }: InferGetServerSidePropsType<typeof getServerSideProps>) {
    return (
        <HomeComponent settings={settings} />
    )
}

export { getServerSideProps };
