import { useReducedMotion } from 'framer-motion';
import { useSyncExternalStore } from 'react';

const subscribe = () => () => {};
const serverSnapshot = () => false;

/** Keep server and hydration markup identical before applying the device preference. */
export function useHydratedReducedMotion() {
    const reducedMotion = useReducedMotion();
    return useSyncExternalStore(subscribe, () => !!reducedMotion, serverSnapshot);
}
