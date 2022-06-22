import { AuthData } from "../context/auth";

class TokenService {
    getAuthData(): (AuthData | undefined | null) {
        return JSON.parse(typeof window !== 'undefined' && window?.localStorage?.getItem("authData")) || undefined;
    }
    getEmail(): (string | undefined | null) {
        return typeof window !== 'undefined' && window?.localStorage?.getItem("email");
    }
    setEmail(email) {
        localStorage.setItem("email", email);
    }
    setAuthData(user) {
        localStorage.setItem("authData", JSON.stringify(user));
    }
    getCodeNextTime(): Date | undefined {
        return JSON.parse(typeof window !== 'undefined' && window?.localStorage?.getItem("codeNextTime")) || undefined;
    }
    setCodeNextTime(time) {
        localStorage.setItem("codeNextTime", JSON.stringify(time));
    }
    removeAuthData() {
        localStorage.removeItem("authData");
    }
}

export default new TokenService();