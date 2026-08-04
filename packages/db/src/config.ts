import { loadPackageConfig } from '@silent-pix/env'

export function loadConfig() {
    return loadPackageConfig(['packages', 'db'])
}