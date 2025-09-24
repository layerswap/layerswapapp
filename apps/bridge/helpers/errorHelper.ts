export const IsExtensionError = (error: Error) => {
    return known_extension_error_stacks.some(s => error?.stack?.includes(s))
        || known_extension_error_messages.some(m => error?.message?.includes(m))
}
const known_extension_error_messages = [
    "chrome-extension",
    "app://"
]
const known_extension_error_stacks = [
    "window.postModalVersion is not a function"
]