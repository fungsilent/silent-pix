const integerPrefix = '\u0000'

// Format validated JSON by changing only whitespace outside strings; preserve numeric and string tokens.
export function formatJsonText(text: string, maxLength = 4 * 1024 * 1024): string {
    const tokens = text.match(/"(?:\\.|[^"\\])*"|[{}[\],:]|[^\s{}[\],:]+/g) ?? []
    const output: string[] = []
    let depth = 0
    let size = 0

    for (const [index, token] of tokens.entries()) {
        let formatted = token
        if (token === '{' || token === '[') {
            depth += 1
            if (tokens[index + 1] !== '}' && tokens[index + 1] !== ']') {
                formatted += '\n' + '  '.repeat(depth)
            }
        } else if (token === '}' || token === ']') {
            depth -= 1
            if (tokens[index - 1] !== '{' && tokens[index - 1] !== '[') {
                formatted = '\n' + '  '.repeat(depth) + token
            }
        } else if (token === ',') {
            formatted = ',\n' + '  '.repeat(depth)
        } else if (token === ':') {
            formatted = ': '
        }

        size += formatted.length
        // shortcut: keep the original above the display limit, use a virtualized viewer if larger documents need formatting.
        if (size > maxLength) return text
        output.push(formatted)
    }

    return output.join('')
}

// Protect unsafe integer tokens before parsing; paired display helpers restore their original spelling.
export function parseJsonPreservingIntegers(text: string): unknown {
    const protectedText = text.replace(/"(?:\\.|[^"\\])*"|-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?/g, token => {
        if (token.startsWith('"') || !/^-?(?:0|[1-9]\d*)$/.test(token) || Number.isSafeInteger(Number(token))) return token
        return `"\\u0000${token}"`
    })
    return JSON.parse(protectedText)
}

export function getJsonIntegerText(value: unknown): string | undefined {
    return typeof value === 'string' && value.startsWith(integerPrefix) ? value.slice(integerPrefix.length) : undefined
}

export function stringifyJsonPreservingIntegers(value: unknown): string {
    const json = JSON.stringify(value) ?? String(value)
    return json.replace(/"\\u0000(-?\d+)"/g, '$1')
}

export function isJsonContainerText(value: string): boolean {
    const text = value.trim()
    if (!text.startsWith('{') && !text.startsWith('[')) return false
    try {
        JSON.parse(text)
        return true
    } catch {
        return false
    }
}

type JsonPropertyLine = {
    line: number
    properties: Map<string, JsonPropertyLine>
}

// Read named properties from validated, two-space JSON; array elements do not form named-property paths.
export function getJsonPropertyLines(text: string): Map<string, JsonPropertyLine> {
    const result = new Map<string, JsonPropertyLine>()
    const objects: (Map<string, JsonPropertyLine> | undefined)[] = [result]

    text.split('\n').forEach((line, index) => {
        const match = /^( +)("(?:[^"\\]|\\.)*"): (.*)$/.exec(line)
        if (!match) return

        const depth = match[1]!.length / 2
        if (!Number.isInteger(depth)) return

        const parent = objects[depth - 1]
        objects.length = depth
        if (!parent) return

        const properties = new Map<string, JsonPropertyLine>()
        parent.set(JSON.parse(match[2]!) as string, { line: index + 1, properties })
        if (match[3] === '{') objects[depth] = properties
    })

    return result
}
