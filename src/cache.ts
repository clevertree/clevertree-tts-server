import crypto from 'crypto'
import fs from 'fs'
import path from 'path'

const CACHE_DIR = process.env.TTS_CACHE_DIR ?? path.join(process.cwd(), 'cache')
const MAX_ENTRIES = parseInt(process.env.TTS_CACHE_MAX_ENTRIES ?? '500', 10)

// Ensure cache directory exists at startup
if (!fs.existsSync(CACHE_DIR)) {
    fs.mkdirSync(CACHE_DIR, { recursive: true })
}

console.log(`Cache dir:    ${CACHE_DIR} (max ${MAX_ENTRIES} entries)`)

/**
 * Compute a deterministic cache key for a synthesis request.
 * Key = SHA-256( voiceId | rate(3dp) | text )
 */
export function cacheKey(text: string, voiceId: string, rate: number): string {
    const payload = `${voiceId}|${rate.toFixed(3)}|${text}`
    return crypto.createHash('sha256').update(payload, 'utf8').digest('hex')
}

/**
 * Return cached audio buffer for the given key, or null on miss.
 * Touches the file's mtime on hit so LRU eviction stays accurate.
 */
export function getCached(key: string): Buffer | null {
    const filepath = path.join(CACHE_DIR, `${key}.wav`)
    if (!fs.existsSync(filepath)) return null
    try {
        const now = new Date()
        fs.utimesSync(filepath, now, now)
        return fs.readFileSync(filepath)
    } catch {
        return null
    }
}

/**
 * Write audio buffer to the cache, then evict the oldest entries
 * if the cache has grown beyond MAX_ENTRIES.
 */
export function putCache(key: string, audio: Buffer): void {
    const filepath = path.join(CACHE_DIR, `${key}.wav`)
    try {
        fs.writeFileSync(filepath, audio)
    } catch (err) {
        console.warn('[CACHE] Write failed:', err)
        return
    }
    evictIfNeeded()
}

function evictIfNeeded(): void {
    try {
        const entries = fs.readdirSync(CACHE_DIR)
            .filter(f => f.endsWith('.wav'))
            .map(f => {
                const full = path.join(CACHE_DIR, f)
                return { file: full, mtime: fs.statSync(full).mtimeMs }
            })
            .sort((a, b) => a.mtime - b.mtime) // oldest first

        if (entries.length > MAX_ENTRIES) {
            const toDelete = entries.slice(0, entries.length - MAX_ENTRIES)
            for (const entry of toDelete) {
                fs.unlinkSync(entry.file)
            }
            console.log(`[CACHE] Evicted ${toDelete.length} old entries (limit: ${MAX_ENTRIES})`)
        }
    } catch (err) {
        console.warn('[CACHE] Eviction check failed:', err)
    }
}
