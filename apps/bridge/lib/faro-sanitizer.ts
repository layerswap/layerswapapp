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
const CIRCULAR = '[Circular]'
const SIZE_LIMIT = '[Maximum size reached]'
const TRUNCATED_KEY = '[truncated]'
export const MAX_CONTEXT_VALUE_LENGTH = 8_192
// Values emitted per sanitization root (one beforeSend payload/meta, one OTLP
// attribute container, one console argument, one flattenContext attribute).
// Releasing ancestors lets shared (DAG) references serialize as copies, so a
// node budget bounds width the way MAX_DEPTH bounds height.
export const MAX_NODES = 5_000

interface Traversal {
    ancestors: WeakSet<object>
    budget: number
}

const createTraversal = (): Traversal => ({ ancestors: new WeakSet(), budget: MAX_NODES })

// The ONLY code that adds to / removes from `ancestors`. Membership means
// "on the current path", so a shared reference is a copy and only a true
// back-edge is reported as a cycle. Release happens in `finally`, so an early
// return or a validation throw inside `visit` never leaves a node marked.
function withAncestor<T>(traversal: Traversal, node: object, onCycle: () => T, visit: () => T): T {
    if (traversal.ancestors.has(node)) return onCycle()
    traversal.ancestors.add(node)
    try {
        return visit()
    }
    finally {
        traversal.ancestors.delete(node)
    }
}

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

const SENSITIVE_TEXT_KEYS = 'authorization|cookie|set[_-]?cookie|api[_-]?key|access[_-]?token|refresh[_-]?token|id[_-]?token|bearer[_-]?token|password|passphrase|private[_-]?key|client[_-]?secret|mnemonic|seed[_-]?phrase|signature'
const SENSITIVE_KEY_VALUE_PATTERN = new RegExp(
    `((?:${SENSITIVE_TEXT_KEYS})["']?\\s*[:=]\\s*)("(?:[^"\\\\]|\\\\.)*"|'(?:[^'\\\\]|\\\\.)*'|\\[[^\\]]*\\]|\\{[^}]*\\}|[^,&}\\n]+)`,
    'gi',
)

function redactSensitiveText(value: string): string {
    return value
        .replace(
            /([?&#](?:code|state|code[_-]?verifier)=)[^&#\s]*/gi,
            `$1${REDACTED}`,
        )
        .replace(/(bearer\s+)[a-z0-9._~+/=-]+/gi, `$1${REDACTED}`)
        .replace(
            /([?&](?:api[_-]?key|access[_-]?token|refresh[_-]?token|id[_-]?token|password|passphrase|private[_-]?key|client[_-]?secret|mnemonic|seed[_-]?phrase|signature)=)[^&#\s]*/gi,
            `$1${REDACTED}`,
        )
        // Quoted, bracketed and braced values are redacted whole, escapes
        // included, so JSON-serialized console arguments keep no credential
        // tail. A bare value runs to the next delimiter rather than the next
        // space: "Basic <credential>", cookie lists and seed phrases all
        // contain spaces.
        .replace(
            SENSITIVE_KEY_VALUE_PATTERN,
            (_match, prefix: string, value: string) => {
                const quote = value[0] === '"' || value[0] === "'" ? value[0] : ''
                return `${prefix}${quote}${REDACTED}${quote}`
            },
        )
}

/**
 * Console arguments are redacted as structured values before Faro flattens
 * them into one error message; key-based redaction is lost once serialized.
 */
export function serializeConsoleArgs(args: unknown[]): string {
    return args.map(arg => {
        const sanitized = sanitizeValue(arg)
        if (typeof sanitized === 'string') return sanitized
        if (sanitized === null || sanitized === undefined || typeof sanitized !== 'object') return String(sanitized)
        try {
            return JSON.stringify(sanitized)
        }
        catch {
            return '[Unserializable]'
        }
    }).join(' ')
}

function sanitizeString(value: string): string {
    const sanitized = redactSensitiveText(value)
    return sanitized.length > MAX_CONTEXT_VALUE_LENGTH
        ? `${sanitized.slice(0, MAX_CONTEXT_VALUE_LENGTH)}...[truncated]`
        : sanitized
}

export function sanitizeValue(value: unknown, key = ''): unknown {
    return sanitizeNode(value, key, createTraversal(), 0)
}

function sanitizeNode(value: unknown, key: string, traversal: Traversal, depth: number): unknown {
    traversal.budget -= 1 // charge every emitted value, markers included
    if (isSensitiveKey(key)) return REDACTED
    if (typeof value === 'string') return sanitizeString(value)
    if (typeof value === 'bigint' || typeof value === 'symbol' || typeof value === 'function') {
        return String(value)
    }
    if (value === null || value === undefined || typeof value !== 'object') return value
    if (depth >= MAX_DEPTH) return DEPTH_LIMIT
    return withAncestor<unknown>(traversal, value, () => CIRCULAR, () => {
        if (value instanceof Error) {
            return {
                name: sanitizeNode(value.name, '', traversal, depth + 1),
                message: sanitizeNode(value.message, '', traversal, depth + 1),
                stack: value.stack ? sanitizeNode(value.stack, '', traversal, depth + 1) : undefined,
            }
        }

        if (Array.isArray(value)) {
            const items: unknown[] = []
            for (const item of value) {
                if (traversal.budget <= 0) {
                    items.push(SIZE_LIMIT)
                    break
                }
                items.push(sanitizeNode(item, key, traversal, depth + 1))
            }
            return items
        }

        const result: Record<string, unknown> = {}
        for (const [nestedKey, nestedValue] of Object.entries(value)) {
            if (traversal.budget <= 0) {
                result[TRUNCATED_KEY] = SIZE_LIMIT
                break
            }
            result[nestedKey] = sanitizeNode(nestedValue, nestedKey, traversal, depth + 1)
        }
        return result
    })
}

type ResourceSpan = NonNullable<TraceEvent['resourceSpans']>[number]
type Span = NonNullable<ResourceSpan['scopeSpans'][number]['spans']>[number]
type Attribute = Span['attributes'][number]
type AnyValue = Attribute['value']

// Count application-value nesting, not the resource/scope/span/KeyValue wrappers.
// Redaction/limits replace an AnyValue with another AnyValue, never a raw string.
function sanitizeAnyValue(value: AnyValue, key: string, traversal: Traversal, depth: number): AnyValue {
    traversal.budget -= 1
    if (isSensitiveKey(key)) return { stringValue: REDACTED }
    if (depth >= MAX_DEPTH) return { stringValue: DEPTH_LIMIT }
    if (!value || typeof value !== 'object') throw new Error('Invalid OTLP AnyValue')
    // Validation stays inside `visit` so a throw still releases the ancestor.
    return withAncestor<AnyValue>(traversal, value, () => ({ stringValue: CIRCULAR }), () => {
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

        if (value.arrayValue) {
            const values: AnyValue[] = []
            for (const item of value.arrayValue.values) {
                if (traversal.budget <= 0) {
                    values.push({ stringValue: SIZE_LIMIT })
                    break
                }
                values.push(sanitizeAnyValue(item, key, traversal, depth + 1))
            }
            return { arrayValue: { values } }
        }
        if (value.kvlistValue) {
            return { kvlistValue: { values: sanitizeAttributes(value.kvlistValue.values, traversal, depth + 1) } }
        }
        if (typeof value.stringValue === 'string') {
            return { stringValue: sanitizeString(value.stringValue) }
        }
        // OTLP bytes are opaque; keep their encoding intact. A sensitive semantic
        // key was already redacted above. Oversize values get a typed marker.
        if (value.bytesValue != null) {
            if (value.bytesValue.length > MAX_CONTEXT_VALUE_LENGTH) return { stringValue: '[truncated]' }
            return { bytesValue: typeof value.bytesValue === 'string' ? value.bytesValue : value.bytesValue.slice() }
        }
        return { ...value }
    })
}

function sanitizeAttributes(attributes: Attribute[], traversal: Traversal, depth: number): Attribute[] {
    const result: Attribute[] = []
    for (const attribute of attributes) {
        if (!attribute || typeof attribute.key !== 'string') throw new Error('Invalid OTLP attribute')
        if (traversal.budget <= 0) {
            result.push({ key: TRUNCATED_KEY, value: { stringValue: SIZE_LIMIT } })
            break
        }
        result.push({
            key: attribute.key,
            value: sanitizeAnyValue(attribute.value, attribute.key, traversal, depth),
        })
    }
    return result
}

function sanitizeAttributeContainer<T extends { attributes?: Attribute[] }>(container: T): T {
    const { attributes, ...fields } = container
    return {
        ...sanitizeValue(fields) as T,
        ...(attributes === undefined ? {} : { attributes: sanitizeAttributes(attributes, createTraversal(), 0) }),
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

/**
 * Flattens nested context into dotted string attributes for Faro event and
 * session APIs. Each top-level attribute is sanitized with its own traversal;
 * recursion only ever receives the fresh object sanitizeValue built, so cycle
 * policy has one owner: `withAncestor`.
 */
export function flattenContext(
    value: Record<string, unknown>,
    prefix = '',
    result: Record<string, string> = {},
): Record<string, string> {
    for (const [key, rawValue] of Object.entries(value)) {
        if (rawValue === undefined || rawValue === null) continue

        const outputKey = prefix ? `${prefix}.${key}` : key
        const sanitizedValue = sanitizeValue(rawValue, key)

        if (
            sanitizedValue !== null
            && !Array.isArray(sanitizedValue)
            && typeof sanitizedValue === 'object'
        ) {
            flattenContext(sanitizedValue as Record<string, unknown>, outputKey, result)
            continue
        }

        const serialized = typeof sanitizedValue === 'string'
            ? sanitizedValue
            : JSON.stringify(sanitizedValue)

        if (serialized !== undefined) {
            result[outputKey] = serialized.length > MAX_CONTEXT_VALUE_LENGTH
                ? `${serialized.slice(0, MAX_CONTEXT_VALUE_LENGTH)}...[truncated]`
                : serialized
        }
    }

    return result
}
