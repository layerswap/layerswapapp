export async function retryWithExponentialBackoff<T>(fn: () => Promise<T>, maxAttempts = 3, baseDelayMs = 1000): Promise<T> {
    let attempt = 1;

    const execute = async (): Promise<T> => {
        try {
            return await fn();
        } catch (error) {
            if (attempt >= maxAttempts) {
                throw error;
            }

            const delayMs = baseDelayMs * 2 ** attempt;
            await new Promise((resolve) => setTimeout(resolve, delayMs));

            attempt++;
            return await execute();
        }
    };

    return await execute();
}

export async function retryUntilFecth<T>(fn: () => Promise<T>, baseDelayMs = 2000): Promise<T> {

    const execute = async (): Promise<T> => {
        try {
            return await fn();
        } catch (error) {
            await new Promise((resolve) => setTimeout(resolve, baseDelayMs));

            return await execute();
        }
    };

    return await execute();
}
