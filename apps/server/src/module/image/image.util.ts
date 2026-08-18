export function imageUrl(imageId: string): string {
    return `/api/image/${imageId}`
}

/*
 * 把 images.path 這個 posix 相對路徑轉成 ComfyUI 那一側的絕對路徑。
 * prefix 含反斜線就當它是 Windows 路徑，分隔符跟著換。
 */
export function comfyImagePath(prefix: string, relativePath: string): string {
    const separator = prefix.includes('\\') ? '\\' : '/'
    const trimmed = prefix.replace(/[\\/]+$/, '')

    return `${trimmed}${separator}${relativePath.split('/').join(separator)}`
}
