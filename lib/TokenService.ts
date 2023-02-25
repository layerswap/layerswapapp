import { AuthData } from "../context/authContext";
import { storageAvailable } from "../helpers/storageAvailable";

class TokenService {
    getAuthData(): (AuthData | undefined | null) {
        return (JSON.parse(storageAvailable('localStorage') && window?.localStorage?.getItem("authData"))) || undefined;
    }
    setAuthData(data) {
        storageAvailable('localStorage') && localStorage.setItem("authData", JSON.stringify(data));
    }
    getCodeNextTime(): Date | undefined {
        return JSON.parse(storageAvailable('localStorage') && window?.localStorage?.getItem("codeNextTime")) || undefined;
    }
    setCodeNextTime(time) {
        storageAvailable('localStorage') && localStorage.setItem("codeNextTime", JSON.stringify(time));
    }
    removeAuthData() {
        storageAvailable('localStorage') && localStorage.removeItem("authData");
    }
}

export default new TokenService();