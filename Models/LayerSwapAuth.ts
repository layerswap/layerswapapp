export class AuthGetCodeResponse {
    data: {
        next: Date
    };
    is_success: boolean;
    request_id: string;
    errors: string;
}

export class AuthConnectResponse {
    access_token: string;
    expires_in: number;
    token_type: string;
    refresh_token: string;
    scope: string;
}