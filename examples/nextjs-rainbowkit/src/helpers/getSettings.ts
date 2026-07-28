
import { getSettings } from '@layerswap/widget'

export async function getServerSideProps() {
    const apiKey = process.env.NEXT_PUBLIC_API_KEY
    const settings = apiKey ? await getSettings(apiKey) : undefined;

    return {
        props: { settings }
    }
}