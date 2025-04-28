
import { GetSettings } from '@layerswap/widget'

export async function getServerSideProps() {

    const settings = await GetSettings()

    return {
        props: { settings }
    }
}