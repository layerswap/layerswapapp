
import { getSettings } from '@layerswap/widget'

export async function getServerSideProps() {

    const settings = await getSettings()

    return {
        props: { settings }
    }
}