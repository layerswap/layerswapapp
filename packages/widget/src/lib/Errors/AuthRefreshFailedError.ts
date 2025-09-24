export class AuthRefreshFailedError extends Error {
    constructor() {
        super("Auth token refresh failed.");
    }
}