'use client'

import { useEffect } from 'react'

export default function DynamicFavicon() {
    useEffect(() => {
        fetch('/api/settings/logo')
            .then(r => r.ok ? r.json() : null)
            .then((data: { logo_url: string | null } | null) => {
                if (!data?.logo_url) return
                // Update or create the favicon link tag
                let link = document.querySelector<HTMLLinkElement>('link[rel="icon"]')
                if (!link) {
                    link = document.createElement('link')
                    link.rel = 'icon'
                    document.head.appendChild(link)
                }
                link.href = data.logo_url
            })
            .catch(() => { })
    }, [])

    return null
}
