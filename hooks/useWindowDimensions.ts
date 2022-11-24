import { useState, useEffect } from 'react';

function getWindowDimensions() {
    const { innerWidth: width, innerHeight: height } = window || {};
    return {
        width,
        height
    };
}

export default function useWindowDimensions() {
    const [windowDimensions, setWindowDimensions] = useState<{ width: number, height: number }>({ width: 0, height: 0 });

    useEffect(() => {
        const dimensions = getWindowDimensions()
        setWindowDimensions(dimensions)
    }, [])
    useEffect(() => {
        function handleResize() {
            setWindowDimensions(getWindowDimensions());

        }

        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);
    return windowDimensions;
}