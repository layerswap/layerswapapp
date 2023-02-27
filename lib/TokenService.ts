import { AuthData } from "../context/authContext";

class TokenService {
    getAuthData(): (AuthData | undefined | null) {
        return JSON.parse(typeof window !== 'undefined' && window?.localStorage?.getItem("authData")) || undefined;
    }
    setAuthData(data) {
        localStorage.setItem("authData", JSON.stringify(data));
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