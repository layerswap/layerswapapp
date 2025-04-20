import { ApiError } from "./ApiError";

export class EmptyApiResponse {
    constructor(error?: ApiError) {
        this.error = error;
    }

    error?: ApiError;
}

export class ApiResponse<T> extends EmptyApiResponse {
    data?: T
}
