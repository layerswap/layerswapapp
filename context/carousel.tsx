import React, { useCallback } from 'react'
type Props = {
    activeIndex: number,
    next: () => void,
    updateIndex: (index: number) => void
}
const CarouselStateContext = React.createContext<Props>(null);


export function CarouselProvider({ children, data }) {
    const [activeIndex, setActiveIndex] = React.useState<number>();

    const next = useCallback(() => {
        setActiveIndex(activeIndex + 1)
    }, [activeIndex])

    const updateIndex = (newIndex) => {
        if (newIndex < 0) {
            newIndex = React.Children.count(children) - 1;
        } else if (newIndex >= React.Children.count(children)) {
            newIndex = 0;
        }
        setActiveIndex(newIndex);
    }

    return (
        <CarouselStateContext.Provider value={{ activeIndex, next, updateIndex }}>
            {children}
        </CarouselStateContext.Provider>
    );
}

export function useCarouselyState() {
    const data = React.useContext<Props>(CarouselStateContext);

    if (data === undefined) {
        throw new Error('useCarouselState must be used within a CarouselStateProvider');
    }

    return data;
}
