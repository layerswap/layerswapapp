export class AuthGetCodeResponse {
    data: {
        next: Date,
        already_sent: boolean
    };
    error: string;
}