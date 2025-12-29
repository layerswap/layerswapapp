import { TokenBalanceError } from "@/Models/Balance";

export type NodeErrorCategory =
    | 'timeout'
    | 'connection_refused'
    | 'rate_limited'
    | 'invalid_response'
    | 'network_error'
    | 'unknown'

export function classifyNodeError(error: Error | unknown | TokenBalanceError): NodeErrorCategory {
    // If it's already a structured error with category, return it
    if (typeof error === 'object' && error !== null && 'category' in error) {
        const category = (error as TokenBalanceError).category;
        if (category) {
            return category;
        }
    }
    
    // Otherwise classify from message
    const message = ((error as Error)?.message || String(error)).toLowerCase()

    if (message.includes('timeout') || message.includes('timed out'))
        return 'timeout'
    if (message.includes('econnrefused') || message.includes('connection refused'))
        return 'connection_refused'
    if (message.includes('429') || message.includes('rate limit'))
        return 'rate_limited'
    if (message.includes('invalid json') || message.includes('unexpected token'))
        return 'invalid_response'
    if (message.includes('network') || message.includes('fetch failed'))
        return 'network_error'

    return 'unknown'
}
