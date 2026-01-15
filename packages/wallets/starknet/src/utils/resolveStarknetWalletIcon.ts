export const resolveStarknetWalletIcon = ({ icon }: { icon: string | {light: string, dark: string} }) => {
    return typeof icon === 'string' ? icon : (icon.dark.startsWith('data:') ? icon.dark : `data:image/svg+xml;base64,${btoa(icon.dark.replaceAll('currentColor', '#FFFFFF'))}`)
}