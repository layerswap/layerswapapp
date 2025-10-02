'use client'

import { useEffect, useRef } from 'react'
import { useRouter } from 'next/router'
import { track } from '@vercel/analytics'

const OMIT_KEYS = [] 

function collectParams(url: string) {
    const u = new URL(url, location.origin)
    const params = new URLSearchParams(u.search)
    const all: Record<string, string> = {}
    params.forEach((v, k) => { all[k] = v })
    // redact
    for (const k of OMIT_KEYS) delete all[k]
    return { all, pathWithQuery: u.pathname + u.search }
}

function isEmbeddedSafely() {
    try { return window.self !== window.top } catch { return true }
}

function sendPartnerEvent(sourceUrl?: string) {
    const href = sourceUrl ?? location.href
    const { all, pathWithQuery } = collectParams(href)

    track('partner_load', {
        ...all,                          // your PersistantQueryParams fields if present
        embedded: isEmbeddedSafely(),    // iframe vs direct
        fullUrl: href,
        referrer: document.referrer || '',
        path: pathWithQuery,
    })
}

export default function PartnerLogger() {
    const router = useRouter()
    const sentInitial = useRef(false)

    // Initial load
    useEffect(() => {
        if (!sentInitial.current) {
            sendPartnerEvent()
            sentInitial.current = true
        }
    }, [])

    // SPA navigations (pages router)
    useEffect(() => {
        const onRoute = (url: string) => sendPartnerEvent(url)
        router.events.on('routeChangeComplete', onRoute)
        return () => router.events.off('routeChangeComplete', onRoute)
    }, [router.events])

    return null
}