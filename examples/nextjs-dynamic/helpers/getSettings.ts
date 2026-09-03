import { getSettings } from '@layerswap/widget'

export async function getServerSideProps() {
    const apiKey = process.env.NEXT_PUBLIC_API_KEY
    const settings = apiKey ? await getSettings(apiKey) : undefined;

    return {
        // getServerSideProps props must be JSON-serializable — `undefined` is not,
        // and `settings.featureFlags` is undefined when the flags fetch fails.
        props: { settings: settings ? { ...settings, featureFlags: settings.featureFlags ?? null } : null }
    }
}
