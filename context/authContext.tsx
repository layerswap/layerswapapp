import React, { useCallback, useEffect, useState } from 'react'
import { parseJwt } from '../lib/jwtParser';
import TokenService from '../lib/TokenService';
import { useSettingsState } from './settings';

const AuthStateContext = React.createContext<AuthState>(null);
const AuthDataUpdateContext = React.createContext<UpdateInterface>(null);

type AuthState = {
    email: string,
    authData: AuthData,
    codeRequested: boolean,
    tempEmail: string,
    userId: string,
    userLockedOut: boolean,
}

export type UpdateInterface = {
    updateTempEmail: (email: string) => void,
    updateAuthData: (data: any) => void,
    getAuthData: () => (AuthData | undefined)
    setCodeRequested(codeSubmitted: boolean): void;
    setUserLockedOut(value: boolean): void
}

export function AuthProvider({ children }) {

    const [email, setEmail] = React.useState<string | undefined>()
    const [tempEmail, setTempEmail] = React.useState<string | undefined>()
    const [authData, setAuthData] = React.useState<AuthData>({})
    const [userId, setUserId] = useState<string>()
    const [codeRequested, setCodeRequested] = React.useState<boolean>(false)
    const [userLockedOut, setUserLockedOut] = React.useState<boolean>(false)

    const updateDataFromLocalStorage = () => {
        const authData = TokenService.getAuthData()
        if (!authData || !authData.access_token)
            return
        const { email, sub } = parseJwt(authData.access_token)
        setAuthData(authData)
        setEmail(email)
        setUserId(sub)
    }

    useEffect(updateDataFromLocalStorage, [])

    useEffect(() => {
        document.addEventListener(
            'storageChange',
            updateDataFromLocalStorage,
            false
        )
        return () => document.removeEventListener('storageChange', updateDataFromLocalStorage)
    }, [])

    const updateFns: UpdateInterface = {
        updateTempEmail: useCallback((email) => {
            setTempEmail(email)
        }, []),
        updateAuthData: useCallback((data) => {
            setCodeRequested(false)
            TokenService.setAuthData(data)
            updateDataFromLocalStorage()
        }, []),
        getAuthData: useCallback(() => {
            return TokenService.getAuthData()
        }, []),
        setCodeRequested: useCallback((codeRequested: boolean) => setCodeRequested(codeRequested), [codeRequested]),
        setUserLockedOut: useCallback((userLockedOut: boolean) => setUserLockedOut(userLockedOut), [userLockedOut]),

    };

    return (
        <AuthStateContext.Provider value={{ email, authData, codeRequested, tempEmail, userId, userLockedOut }}>
            <AuthDataUpdateContext.Provider value={updateFns}>
                {children}
            </AuthDataUpdateContext.Provider>
        </AuthStateContext.Provider>
    )
}

export function useAuthState() {
    const data = React.useContext<AuthState>(AuthStateContext);

    if (data === undefined) {
        throw new Error('useAuthState must be used within a AuthStateProvider');
    }

    return data;
}


export function useAuthDataUpdate() {
    const updateFns = React.useContext<UpdateInterface>(AuthDataUpdateContext);

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