import {
    TransportItemType,
    type APIEvent,
    type Meta,
    type TraceEvent,
    type TransportItem,
} from '@grafana/faro-web-sdk'

const REDACTED = '[REDACTED]'
const MAX_DEPTH = 8
const DEPTH_LIMIT = '[Maximum depth reached]'
export const MAX_CONTEXT_VALUE_LENGTH = 8_192

const normalizedSensitiveKeys = [
    'authorization',
    'cookie',
    'setcookie',
    'apikey',
    'accesstoken',
    'refreshtoken',
    'idtoken',
    'password',
    'passphrase',
    'privatekey',
    'clientsecret',
    'mnemonic',
    'seedphrase',
    'bearertoken',
    'signature',
]

function isSensitiveKey(key: string): boolean {
    const normalizedKey = key.replace(/[^a-z0-9]/gi, '').toLowerCase()
    return normalizedSensitiveKeys.some(sensitiveKey => normalizedKey.includes(sensitiveKey))
}

function redactSensitiveText(value: string): string {
    return value
        .replace(/(bearer\s+)[a-z0-9._~+/=-]+/gi, `$1${REDACTED}`)
        .replace(
            /([?&](?:api[_-]?key|access[_-]?token|refresh[_-]?token|id[_-]?token|password|passphrase|private[_-]?key|client[_-]?secret|mnemonic|seed[_-]?phrase|signature)=)[^&#\s]*/gi,
            `$1${REDACTED}`,
        )
        .replace(
            /((?:authorization|api[_-]?key|access[_-]?token|refresh[_-]?token|id[_-]?token|password|passphrase|private[_-]?key|client[_-]?secret|mnemonic|seed[_-]?phrase|signature)["']?\s*[:=]\s*["']?)[^,"'\s}]+/gi,
            `$1${REDACTED}`,
        )
}

export function sanitizeValue(
    value: unknown,
    key = '',
    seen = new WeakSet<object>(),
    depth = 0,
): unknown {
    if (isSensitiveKey(key)) return REDACTED
    if (typeof value === 'string') {
        const sanitized = redactSensitiveText(value)
        return sanitized.length > MAX_CONTEXT_VALUE_LENGTH
            ? `${sanitized.slice(0, MAX_CONTEXT_VALUE_LENGTH)}...[truncated]`
            : sanitized
    }
    if (typeof value === 'bigint' || typeof value === 'symbol' || typeof value === 'function') {
        return String(value)
    }
    if (value === null || value === undefined || typeof value !== 'object') return value
    if (depth >= MAX_DEPTH) return DEPTH_LIMIT
    if (seen.has(value)) return '[Circular]'

    seen.add(value)

    if (value instanceof Error) {
        return {
            name: sanitizeValue(value.name),
            message: sanitizeValue(value.message),
            stack: value.stack ? sanitizeValue(value.stack) : undefined,
        }
    }

    if (Array.isArray(value)) {
        return value.map(item => sanitizeValue(item, key, seen, depth + 1))
    }

    return Object.fromEntries(
        Object.entries(value).map(([nestedKey, nestedValue]) => [
            nestedKey,
            sanitizeValue(nestedValue, nestedKey, seen, depth + 1),
        ]),
    )
}

type ResourceSpan = NonNullable<TraceEvent['resourceSpans']>[number]
type Span = NonNullable<ResourceSpan['scopeSpans'][number]['spans']>[number]
type Attribute = Span['attributes'][number]
type AnyValue = Attribute['value']

// Count application-value nesting, not the resource/scope/span/KeyValue wrappers.
// Redaction/limits replace an AnyValue with another AnyValue, never a raw string.
function sanitizeAnyValue(value: AnyValue, key: string, seen: WeakSet<object>, depth: number): AnyValue {
    if (isSensitiveKey(key)) return { stringValue: REDACTED }
    if (depth >= MAX_DEPTH) return { stringValue: DEPTH_LIMIT }
    if (!value || typeof value !== 'object') throw new Error('Invalid OTLP AnyValue')
    if (seen.has(value)) return { stringValue: '[Circular]' }
    const variants = Object.keys(value)
    if (variants.length > 1 || variants.some(variant => ![
        'stringValue', 'boolValue', 'intValue', 'doubleValue', 'bytesValue', 'arrayValue', 'kvlistValue',
    ].includes(variant))) throw new Error('Invalid OTLP AnyValue variant')
    const variant = variants[0]
    const scalar = value[variant as keyof AnyValue]
    if (scalar == null) return {}
    if (
        (variant === 'stringValue' && typeof scalar !== 'string')
        || (variant === 'boolValue' && typeof scalar !== 'boolean')
        || (variant === 'intValue' && !(
            (typeof scalar === 'number' && Number.isInteger(scalar))
            || (typeof scalar === 'string' && /^-?\d+$/.test(scalar))
        ))
        || (variant === 'doubleValue' && !(typeof scalar === 'number' && Number.isFinite(scalar)))
        || (variant === 'bytesValue' && !(typeof scalar === 'string' || scalar instanceof Uint8Array))
    ) throw new Error('Invalid OTLP scalar')

    seen.add(value)
    try {
        if (value.arrayValue) {
            return { arrayValue: { values: value.arrayValue.values.map(item => sanitizeAnyValue(item, key, seen, depth + 1)) } }
        }
        if (value.kvlistValue) {
            return { kvlistValue: { values: sanitizeAttributes(value.kvlistValue.values, seen, depth + 1) } }
        }
        if (typeof value.stringValue === 'string') {
            return { stringValue: sanitizeValue(value.stringValue) as string }
        }
        // OTLP bytes are opaque; keep their encoding intact. A sensitive semantic
        // key was already redacted above. Oversize values get a typed marker.
        if (value.bytesValue != null) {
            if (value.bytesValue.length > MAX_CONTEXT_VALUE_LENGTH) return { stringValue: '[truncated]' }
            return { bytesValue: typeof value.bytesValue === 'string' ? value.bytesValue : value.bytesValue.slice() }
        }
        return { ...value }
    }
    finally {
        seen.delete(value)
    }
}

function sanitizeAttributes(attributes: Attribute[], seen = new WeakSet<object>(), depth = 0): Attribute[] {
    return attributes.map(attribute => {
        if (!attribute || typeof attribute.key !== 'string') throw new Error('Invalid OTLP attribute')
        return {
            key: attribute.key,
            value: sanitizeAnyValue(attribute.value, attribute.key, seen, depth),
        }
    })
}

function sanitizeAttributeContainer<T extends { attributes?: Attribute[] }>(container: T): T {
    const { attributes, ...fields } = container
    return {
        ...sanitizeValue(fields) as T,
        ...(attributes === undefined ? {} : { attributes: sanitizeAttributes(attributes) }),
    }
}

function sanitizeTraces(payload: TraceEvent): TraceEvent {
    const { resourceSpans, ...fields } = payload
    return {
        ...sanitizeValue(fields) as TraceEvent,
        ...(resourceSpans === undefined ? {} : {
            resourceSpans: resourceSpans.map(({ resource, scopeSpans, ...resourceFields }) => ({
                ...sanitizeValue(resourceFields) as typeof resourceFields,
                ...(resource === undefined ? {} : { resource: sanitizeAttributeContainer(resource) }),
                scopeSpans: scopeSpans.map(({ scope, spans, ...scopeFields }) => ({
                    ...sanitizeValue(scopeFields) as typeof scopeFields,
                    ...(scope === undefined ? {} : { scope: sanitizeAttributeContainer(scope) }),
                    ...(spans === undefined ? {} : {
                        spans: spans.map(({ events, links, ...span }) => ({
                            ...sanitizeAttributeContainer(span),
                            events: events.map(event => sanitizeAttributeContainer(event)),
                            links: links.map(link => sanitizeAttributeContainer(link)),
                        })),
                    }),
                })),
            })),
        }),
    }
}

export function beforeSend(item: TransportItem): TransportItem | null {
    if (
        item.type === TransportItemType.EXCEPTION
        && 'value' in item.payload
        && typeof item.payload.value === 'string'
        && item.payload.value.includes('ResizeObserver loop')
    ) {
        return null
    }

    let payload: APIEvent
    if (item.type === TransportItemType.TRACE) {
        try {
            payload = sanitizeTraces(item.payload as TraceEvent)
        }
        catch {
            // Fail closed for malformed trace envelopes, without recursively
            // reporting their potentially sensitive contents through Faro.
            return null
        }
    }
    else {
        payload = sanitizeValue(item.payload) as APIEvent
    }

    return { ...item, payload, meta: sanitizeValue(item.meta) as Meta }
}
