import { loadConfig } from '#/config'

// NOTE: WebView2 serves packaged pages from `http://tauri.localhost`, while WKWebView
// and WebKitGTK use the custom `tauri://localhost` scheme. A webview that sends no
// Origin, or `null`, stays rejected.
const packagedDesktopOrigins: readonly string[] = ['http://tauri.localhost', 'tauri://localhost']
const development = loadConfig().nodeEnv === 'development'


function developmentOrigin(origin: string | null): string | undefined {
    if (!development || !origin) {
        return undefined
    }

    try {
        const url = new URL(origin)
        return (url.protocol === 'http:' || url.protocol === 'https:') && url.origin === origin
            ? origin
            : undefined
    }
    catch {
        return undefined
    }
}

function isLoopbackHost(host: string | null): boolean {
    const match = /^127\.0\.0\.1:([1-9][0-9]{0,4})$/.exec(host ?? '')
    if (!match) {
        return false
    }

    const port = Number(match[1])
    return Number.isInteger(port) && port <= 65535 && port !== 80
}

function isSameOriginHost(origin: string | null, host: string): boolean {
    if (!origin) {
        return false
    }

    try {
        return new URL(origin).host === host
    }
    catch {
        return false
    }
}

function packagedDesktopLoopbackOrigin(origin: string | null, host: string | null): string | undefined {
    if (origin === null || !packagedDesktopOrigins.includes(origin) || !isLoopbackHost(host)) {
        return undefined
    }

    return origin
}

function allowedCrossOrigin(origin: string | null, host: string | null): string | undefined {
    return developmentOrigin(origin) ?? packagedDesktopLoopbackOrigin(origin, host)
}

export function isWebSocketOriginAllowed(origin: string | null, host: string | null): boolean {
    if (!host) {
        return false
    }

    return developmentOrigin(origin) !== undefined
        || isSameOriginHost(origin, host)
        || packagedDesktopLoopbackOrigin(origin, host) !== undefined
}

export function applyApiCors(
    request: Request,
    responseHeaders: Record<string, unknown>,
): Response | undefined {
    // NOTE: every response in the scoped /api group varies on Origin, including the
    // ones without CORS headers, so a shared cache cannot reuse a same-origin response
    // for the packaged Desktop origin or the reverse.
    const vary = request.method === 'OPTIONS'
        ? 'Origin, Access-Control-Request-Method, Access-Control-Request-Headers'
        : 'Origin'
    responseHeaders.vary = vary

    const allowedOrigin = allowedCrossOrigin(
        request.headers.get('origin'),
        request.headers.get('host'),
    )
    if (!allowedOrigin) {
        return undefined
    }

    const headers = new Headers({
        'access-control-allow-origin': allowedOrigin,
        vary,
    })

    if (request.method === 'OPTIONS') {
        headers.set('access-control-allow-methods', 'GET, POST, PUT, PATCH, DELETE')
        headers.set('access-control-allow-headers', 'client-id, content-type')
        headers.set('access-control-max-age', '600')
    }

    headers.forEach((value, key) => {
        responseHeaders[key] = value
    })

    if (request.method === 'OPTIONS') {
        return new Response(null, { status: 204, headers })
    }
}
