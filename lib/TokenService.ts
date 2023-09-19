import { AuthData } from "../context/authContext";
import { checkStorageIsAvailable } from "../helpers/storageAvailable";

class TokenService {
    getAuthData(): (AuthData | undefined | null) {
        return (JSON.parse(checkStorageIsAvailable('localStorage') && (window?.localStorage?.getItem("authData") || "null"))) || undefined;
    }
    setAuthData(data) {
        checkStorageIsAvailable('localStorage') && localStorage.setItem("authData", JSON.stringify(data));
    }
    getCodeNextTime(): Date | undefined {
        return JSON.parse(checkStorageIsAvailable('localStorage') && (window?.localStorage?.getItem("codeNextTime") || "null")) || undefined;
    }
    setCodeNextTime(time) {
        checkStorageIsAvailable('localStorage') && localStorage.setItem("codeNextTime", JSON.stringify(time));
    }
    removeAuthData() {
        checkStorageIsAvailable('localStorage') && localStorage.removeItem("authData");
    }
}

let tokenService = new TokenService();
export default tokenService;