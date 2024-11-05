import { Context, Dispatch, FC, ReactNode, SetStateAction, createContext, useContext, useState } from 'react';

export type SnapElement = {
    id: number;
    height: number | string;
}

type SnapPointsState = {
    snapPoints: SnapElement[];
    snapElemenetsHeight: SnapElement[];
    setSnapElemenetsHeight: Dispatch<SetStateAction<SnapElement[]>>;
    headerHeight: number;
    setHeaderHeight: Dispatch<SetStateAction<number>>;
}

export const SnapPointsContext = createContext<SnapPointsState | undefined>(undefined);

export const SnapPointsProvider: FC<{ children: ReactNode, isMobile: boolean }> = ({ children, isMobile }) => {

    const [snapElemenetsHeight, setSnapElemenetsHeight] = useState<SnapElement[]>([]);
    const [headerHeight, setHeaderHeight] = useState<number>(0);

    const snapPoints = resolveSnapPoints({
        isMobile,
        snapPointsCount: snapElemenetsHeight.length,
        childrenHeights: snapElemenetsHeight.sort((a, b) => a.id - b.id),
        headerHeight
    });

    const contextValue: SnapPointsState = {
        snapPoints,
        snapElemenetsHeight,
        setSnapElemenetsHeight,
        headerHeight,
        setHeaderHeight
    };

    return (
        <SnapPointsContext.Provider value={contextValue}>
            {children}
        </SnapPointsContext.Provider>
    );
};

const resolveSnapPoints = ({ isMobile, snapPointsCount, childrenHeights, headerHeight }: { snapPointsCount: number, isMobile: boolean, childrenHeights: SnapElement[], headerHeight: number }) => {

    let points: SnapElement[] = [];

    function sumBeforeIndex(arr, n) {
        if (n <= 0) return 0; // If n is 0 or negative, the sum is 0
        return arr.slice(0, n).reduce((acc, curr) => acc + curr, 0);
    }

    for (let i = 0; i < snapPointsCount; i++) {

        const result = sumBeforeIndex(childrenHeights.map(h => h.height), i);

        if(typeof window === 'undefined') return [{ id: i + 1, height: 1 }];

        const pointHeight = childrenHeights?.[i]?.height + result + headerHeight;
        const viewportHeight = isMobile ? window.innerHeight : document.getElementById('widget')?.offsetHeight;

        if (!pointHeight || !viewportHeight) return [{ id: i + 1, height: 1 }];

        if ((pointHeight && viewportHeight) && pointHeight > (viewportHeight * .98)) {
            points.push({ id: i + 1, height: 1 });
            break;
        }
        else if (pointHeight) points.push({ id: i + 1, height: `${pointHeight}px` });
        else points.push({ id: i + 1, height: 1 });

    }

    return points;
}


export function useSnapPoints() {
    const data = useContext(SnapPointsContext as Context<SnapPointsState>);

    if (data === null) {
        throw new Error('useSnapPoints must be used within a SnapPointsProvider');
    }

    return data;
}