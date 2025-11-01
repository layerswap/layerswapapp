
import { getSettings } from '@layerswap/widget'

export async function getServerSideProps() {

    const settings = await getSettings('NDBxG+aon6WlbgIA2LfwmcbLU52qUL9qTnztTuTRPNSohf/VnxXpRaJlA5uLSQVqP8YGIiy/0mz+mMeZhLY4/Q')

    return {
        props: { settings }
    }
}