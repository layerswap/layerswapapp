
import { getSettings } from '@layerswap/widget'

export async function getServerSideProps() {

    const settings = await getSettings(process.env.NEXT_PUBLIC_API_KEY!)

    return {
        props: { settings }
    }
}