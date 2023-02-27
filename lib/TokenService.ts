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
    localStorageIsEnabled (){
        try {
            localStorage.setItem('_ls-test-key', 'ls_test_data')
            localStorage.getItem('_ls-test-key')
            localStorage.removeItem('_ls-test-key')
            return true
          } catch (e) {
            return false
          }
    }
}

export default new TokenService();