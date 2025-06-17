import { UpdateAuthInterface } from "../../../context/authContext"

const MockFunctions: UpdateAuthInterface = {
    updateTempEmail: () => { throw new Error("Not implemented") },
    updateAuthData: () => { throw new Error("Not implemented") },
    getAuthData: () => { throw new Error("Not implemented") },
    setCodeRequested: () => { throw new Error("Not implemented") },
    setUserLockedOut: () => { throw new Error("Not implemented") },
    setUserType: () => { throw new Error("Not implemented") },
}


export default MockFunctions