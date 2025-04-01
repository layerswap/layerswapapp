export default async function retryWithExponentialBackoff(fn, maxAttempts = 3, baseDelayMs = 1000) {
    let attempt = 1

    const execute = async () => {
        try {
            return await fn()
        } catch (error) {
            if (attempt >= maxAttempts) {
                throw error
            }

            const delayMs = baseDelayMs * 2 ** attempt
            await new Promise((resolve) => setTimeout(resolve, delayMs))

            attempt++
            return await execute()
        }
    }

    return await execute()
}

export async function retry(fn, maxAttempts = 3, baseDelayMs = 1000) {
    let attempt = 1

    const execute = async () => {
        try {
            return await fn()
        } catch (error) {
            if (attempt >= maxAttempts) {
                throw error
            }

            await new Promise((resolve) => setTimeout(resolve, baseDelayMs))

            attempt++
            return await execute()
        }
    }

    return await execute()
}