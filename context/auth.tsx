import React from 'react'

const AuthStateContext = React.createContext<any>(null);
const AuthDataUpdateContext = React.createContext<any>(null);


export function AuthProvider({ children }) {
    const [email, setEmail] = React.useState<string | undefined>()
    const [authData, setAuthData] = React.useState({});

    const updateFns = {
        updateEmail: (email) => {
            setEmail(email)
        },
        updateAuthData: (data) => {
            setAuthData(data)
        }
    };

    return (
        <AuthStateContext.Provider value={{ email, authData }}>
            <AuthDataUpdateContext.Provider value={updateFns}>
                {children}
            </AuthDataUpdateContext.Provider>
        </AuthStateContext.Provider>
    );
}

export function useAuthState() {
    const data = React.useContext(AuthStateContext);

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