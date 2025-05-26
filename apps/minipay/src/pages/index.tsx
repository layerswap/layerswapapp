import { HomeComponent } from "@/components/HomeComponent";
import { GetSettings } from "@layerswap/widget";
import { InferGetServerSidePropsType } from "next";

export default function Home({ settings }: InferGetServerSidePropsType<typeof getServerSideProps>) {
    return (
        <HomeComponent settings={settings} />
    )
}

export async function getServerSideProps() {

    const settings = await GetSettings()

    return {
        props: { settings },
    }
}