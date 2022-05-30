import React from 'react'
import useStorage from '../hooks/useStorage';

const AuthStateContext = React.createContext<any>(null);
const AuthDataUpdateContext = React.createContext<any>(null);


export function AuthProvider({ children }) {
    const { getItem, setItem } = useStorage()
    const [email, setEmail] = React.useState<string | undefined>(getItem("email"))
    const [authData, setAuthData] = React.useState<AuthData>(JSON.parse(getItem("authData") || "{}"));

    const updateFns = {
        updateEmail: (email) => {
            setItem("email", email)
            setEmail(email)
        },
        updateAuthData: (data) => {
            setItem("authData", JSON.stringify(data))
            setAuthData(data)
        }
    };

    return (
        <AuthStateContext.Provider value={{ email, authData }}>
            <AuthDataUpdateContext.Provider value={updateFns}>
                {children}
            </AuthDataUpdateContext.Provider>
        </AuthStateContext.Provider>
    )
}

export function useAuthState() {
    const data = React.useContext<{ authData: AuthData, email: string }>(AuthStateContext);

    if (data === undefined) {
        throw new Error('useAuthState must be used within a AuthStateProvider');
    }

    return data;
}


export function useAuthDataUpdate() {
    const updateFns = React.useContext(AuthDataUpdateContext);

    if (updateFns === undefined) {
        throw new Error('useAuthDataUpdate must be used within a AuthDataProvider');
    }

    return updateFns;
}

export type AuthData = {
    access_token?: string,
    expires_in?: number,
    refresh_token?: string,
    scope?: string,
    token_type?: string,
}