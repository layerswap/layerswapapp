export const resolveStarknetWalletIcon = ({ icon }: { icon: string | {light: string, dark: string} }) => {
    return typeof icon === 'string' ? icon : (icon.light.startsWith('data:') ? icon.light : `data:image/svg+xml;base64,${btoa(icon.light.replaceAll('currentColor', '#FFFFFF'))}`)
}