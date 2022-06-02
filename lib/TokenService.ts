import { AuthData } from "../context/auth";

class TokenService {
    getAuthData(): AuthData {
        return JSON.parse(window.localStorage.getItem("authData"));
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