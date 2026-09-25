import { useEffect, useLayoutEffect } from 'react'

/** useLayoutEffect on the client, useEffect during SSR so React does not warn. */
export const useClientLayoutEffect = typeof window === 'undefined' ? useEffect : useLayoutEffect
