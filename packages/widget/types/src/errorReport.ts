import type { ErrorEventType, ErrorReportInput, ErrorResponseSummary, ErrorSummary, FailedTokenSummary } from './logEvents';
import { getErrorOccurrenceId } from './errorOccurrence';

// Only engine-owned getters are invoked; provider accessors and toJSON never are. V8 may expose
// the lazy stack as an own accessor, SpiderMonkey keeps `stack` on Error.prototype, and
// DOMException (AbortError, NotAllowedError, ...) keeps name/message/code on its prototype.
const engineGetters = new Map<string, Set<Function>>();
function trustGetter(owner: object | undefined, key: string) {
  const get = owner && Object.getOwnPropertyDescriptor(owner, key)?.get;
  if (!get) return;
  const getters = engineGetters.get(key) ?? new Set<Function>();
  engineGetters.set(key, getters.add(get));
}
trustGetter(new Error(), 'stack');
trustGetter(Error.prototype, 'stack');
if (typeof DOMException === 'function') for (const key of ['name', 'message', 'code']) trustGetter(DOMException.prototype, key);

function read(target: unknown, key: string): unknown {
  try {
    let owner = target;
    for (let depth = 0; owner && typeof owner === 'object' && depth < 8; depth++) {
      const property = Object.getOwnPropertyDescriptor(owner, key);
      if (property) {
        if ('value' in property) return property.value;
        return property.get && engineGetters.get(key)?.has(property.get) ? property.get.call(target) : undefined;
      }
      owner = Object.getPrototypeOf(owner);
    }
  } catch { /* Foreign proxies can throw; reporting remains best effort. */ }
  return undefined;
}

/** Redacts credential-shaped key/value pairs; wallet signatures are replay-bound, not credentials. */
function clean(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  return value.replace(/(bearer\s+)[a-z0-9._~+/=-]+/gi, '$1[REDACTED]')
    .replace(/((?:authorization|cookie|api[_-]?key|x-ls-apikey|access[_-]?token|refresh[_-]?token|private[_-]?key|password|secret)["']?\s*[:=]\s*)("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|[^,&}\n]+)/gi, '$1[REDACTED]')
    .slice(0, 8192);
}

const URL_PARTS = /^([a-z][a-z0-9+.-]*:\/\/)(?:[^/?#@\s]*@)?([^/?#\s]*)(.*)$/is;
const CODE_LOCATION = /(?::\d+){1,2}$/;

/**
 * Provider URLs (RPC nodes) often carry an API key in the path, so only scheme and host
 * are diagnostic. A stack-frame location (`.../chunk.js:12:34`) points at code and keeps
 * its path. Query, fragment and userinfo never survive.
 */
function providerUrl(raw: string): string {
  const parts = URL_PARTS.exec(raw);
  if (!parts) return raw.split(/[?#]/, 1)[0];
  const [, scheme, host, rest] = parts;
  const location = CODE_LOCATION.exec(rest)?.[0];
  return scheme + host + (location ? rest.split(/[?#]/, 1)[0].replace(CODE_LOCATION, '') + location : '');
}

/** Free text: every embedded URL is treated as a provider URL. */
function text(value: unknown): string | undefined {
  return clean(value)?.replace(/\b(?:https?|wss?):\/\/[^\s"'<>()[\]{}\\,]+/gi, providerUrl);
}

/** Layerswap API routes: the path identifies the call and carries no credentials. */
function apiUrl(value: unknown): string | undefined {
  return clean(value)?.split(/[?#]/, 1)[0].replace(/((?:https?|wss?):\/\/)[^/\s]*@/gi, '$1');
}

function nodeUrl(value: unknown): string | undefined {
  const result = clean(value);
  return result === undefined ? undefined : providerUrl(result);
}

function scalar(value: unknown): string | number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : text(value);
}

/** No copying/spreading of foreign objects, and no arbitrary recursive serialization. */
export function summarizeError(value: unknown, depth = 0): ErrorSummary | undefined {
  if (value == null || depth >= 4) return undefined;
  if (typeof value !== 'object') {
    const message = text(value);
    return message === undefined ? undefined : { message };
  }
  const result: ErrorSummary = {};
  for (const key of ['name', 'message', 'stack', 'method'] as const) {
    const field = text(read(value, key));
    if (field !== undefined) result[key] = field;
  }
  for (const key of ['code', 'status'] as const) {
    const field = scalar(read(value, key));
    if (field !== undefined) result[key] = field;
  }
  // Axios transport details are read explicitly; config/request/body never leave this boundary.
  const config = read(value, 'config');
  const method = text(read(config, 'method'));
  const status = scalar(read(read(value, 'response'), 'status'));
  if (result.method === undefined && method !== undefined) result.method = method;
  if (result.status === undefined && status !== undefined) result.status = status;
  const safeUrl = nodeUrl(read(value, 'url') ?? read(config, 'url'));
  if (safeUrl !== undefined) result.url = safeUrl;
  const cause = summarizeError(read(value, 'cause'), depth + 1);
  if (cause) result.cause = cause;
  return Object.keys(result).length ? result : undefined;
}

function response(value: unknown): ErrorResponseSummary | undefined {
  if (!value || typeof value !== 'object') return undefined;
  const result: ErrorResponseSummary = {};
  const code = scalar(read(value, 'code'));
  const message = text(read(value, 'message'));
  if (code !== undefined) result.code = code;
  if (message !== undefined) result.message = message;
  const error = read(value, 'error');
  if (error && typeof error === 'object') {
    // Response bodies contribute only the server's error code/message, never echoed requests.
    const summary = responseCodeAndMessage(error);
    if (Object.keys(summary).length) result.error = summary;
  }
  return Object.keys(result).length ? result : undefined;
}

function responseCodeAndMessage(value: unknown): ErrorSummary {
  const result: ErrorSummary = {};
  const code = scalar(read(value, 'code'));
  const message = text(read(value, 'message'));
  if (code !== undefined) result.code = code;
  if (message !== undefined) result.message = message;
  return result;
}

const stringFields = ['occurrenceId', 'reasonCode', 'name', 'message', 'stack', 'statusText', 'requestMethod',
  'network', 'address', 'error_category', 'response_status_text', 'error_code', 'swapId', 'transactionHash',
  'fromAddress', 'toAddress', 'token', 'operation'] as const;
/** Layerswap API routes keep their path; provider/RPC URLs keep only scheme and host. */
const apiUrlFields = ['endpoint', 'requestUrl'] as const;
const providerUrlFields = ['node_url', 'request_url'] as const;
const numberFields = ['requestedAmount', 'walletBalance', 'calculatedGas', 'difference', 'response_status'] as const;
const arrayFields = ['error_categories', 'error_codes', 'http_statuses', 'nodes'] as const;

// A new public field requires an explicit serialization policy here.
type UnionKeys<T> = T extends unknown ? keyof T : never;
type HandledField = typeof stringFields[number] | typeof apiUrlFields[number] | typeof providerUrlFields[number] | typeof numberFields[number]
  | typeof arrayFields[number] | 'type' | 'status' | 'cause' | 'responseData' | 'response_data' | 'failed_tokens';
type AssertNever<T extends never> = T;
type AllFieldsHandled = AssertNever<Exclude<UnionKeys<ErrorEventType>, HandledField>>;

function buildErrorReport(event: ErrorReportInput): ErrorEventType {
  const result: Record<string, unknown> & { type: ErrorEventType['type']; message: string } = {
    type: (text(read(event, 'type')) ?? 'ErrorFallback') as ErrorEventType['type'],
    message: text(read(event, 'message')) ?? 'Unknown error',
  };
  for (const key of stringFields) {
    const field = text(read(event, key));
    if (field !== undefined) result[key] = field;
  }
  for (const key of apiUrlFields) {
    const field = apiUrl(read(event, key));
    if (field !== undefined) result[key] = field;
  }
  for (const key of providerUrlFields) {
    const field = nodeUrl(read(event, key));
    if (field !== undefined) result[key] = field;
  }
  for (const key of numberFields) {
    const field = read(event, key);
    if (typeof field === 'number' && Number.isFinite(field)) result[key] = field;
  }
  const status = scalar(read(event, 'status'));
  if (status !== undefined) result.status = status;
  for (const key of arrayFields) {
    const field = read(event, key);
    if (Array.isArray(field)) result[key] = field.slice(0, 100).map(key === 'nodes' ? nodeUrl : scalar).filter(v => v !== undefined);
  }
  const cause = summarizeError(read(event, 'cause'));
  if (cause) result.cause = cause;
  for (const key of ['responseData', 'response_data'] as const) {
    const summary = response(read(event, key));
    if (summary) result[key] = summary;
  }
  const failedTokens = read(event, 'failed_tokens');
  if (Array.isArray(failedTokens)) result.failed_tokens = failedTokens.slice(0, 100).map(value => {
    const token: FailedTokenSummary = {};
    for (const key of ['token', 'error_message', 'error_name', 'error_category', 'response_status_text', 'error_stack'] as const) {
      const field = text(read(value, key));
      if (field !== undefined) token[key] = field;
    }
    const code = scalar(read(value, 'error_code'));
    if (code !== undefined) token.error_code = code;
    const status = read(value, 'response_status');
    if (typeof status === 'number' && Number.isFinite(status)) token.response_status = status;
    const requestUrl = nodeUrl(read(value, 'request_url'));
    if (requestUrl !== undefined) token.request_url = requestUrl;
    const responseData = response(read(value, 'response_data'));
    if (responseData !== undefined) token.response_data = responseData;
    return token;
  });
  result.message ??= 'Unknown error';
  result.occurrenceId ??= getErrorOccurrenceId(event);
  return result as ErrorEventType;
}

export function toErrorReport(event: ErrorReportInput): ErrorEventType {
  try { return buildErrorReport(event); }
  catch {
    // Even hostile proxies/array subclasses cannot make an optional report fail an operation.
    return { type: 'ErrorFallback', message: 'Error details unavailable', occurrenceId: getErrorOccurrenceId(event) };
  }
}
