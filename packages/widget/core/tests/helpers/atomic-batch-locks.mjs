// Model the browser's origin-wide exclusive lock queue across independent tabs.
export function createLockManager() {
    const queues = new Map()
    return {
        async request(name, callback) {
            const previous = queues.get(name) ?? Promise.resolve()
            let release
            const current = new Promise(resolve => { release = resolve })
            queues.set(name, current)
            await previous
            try {
                return await callback({ name, mode: 'exclusive' })
            } finally {
                release()
                if (queues.get(name) === current) queues.delete(name)
            }
        },
    }
}
