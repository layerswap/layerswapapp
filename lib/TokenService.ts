import { AuthData } from "../context/auth";

class TokenService {
    getAuthData(): (AuthData | undefined | null) {
        return JSON.parse(typeof window !== 'undefined' && window?.localStorage?.getItem("authData")) || undefined;
    }
    setAuthData(user) {
        console.log(JSON.stringify(user));
        localStorage.setItem("authData", JSON.stringify(user));
    }
    removeAuthData() {
        localStorage.removeItem("authData");
    }
}

export default new TokenService();