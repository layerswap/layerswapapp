import { createContext, useState, useContext } from 'react'

const MenuStateContext = createContext<ContextType | null>(null);

type ContextType = {
    menuVisible: boolean,
    setMenuVisible: (value: boolean) => void
}

export function MenuProvider({ children }) {

    const [menuVisible, setMenuVisible] = useState<boolean>(true)

    return (
        <MenuStateContext.Provider value={{ menuVisible, setMenuVisible }}>
            {children}
        </MenuStateContext.Provider>
    )
}

export function useMenuState() {
    const data = useContext(MenuStateContext);

    if (data === undefined) {
        throw new Error('useMenuState must be used within a MenuStateProvider');
    }

    return data;
}
