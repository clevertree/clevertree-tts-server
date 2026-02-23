import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import { getVoices, getDefaultVoiceId, resolveVoice } from './voices'
import { synthesize } from './tts'

const PORT = parseInt(process.env.PORT ?? '3100', 10)
const SECRET = process.env.CLEVERTREE_TTS_SECRET ?? ''
const PIPER_BIN = process.env.PIPER_BIN ?? '/opt/piper/piper'
const MODELS_DIR = process.env.PIPER_MODELS_DIR ?? '/opt/piper/voices'
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS ?? '')
    .split(',')
    .map(s => s.trim())
    .filter(Boolean)

const app = express()

// ── CORS ──────────────────────────────────────────────────────────
app.use(
    cors({
        origin: (origin, cb) => {
            // Allow requests with no origin (curl, server-to-server)
            if (!origin) return cb(null, true)
            if (ALLOWED_ORIGINS.includes(origin)) return cb(null, origin)
            return cb(new Error('Origin not allowed'), false)
        },
        methods: ['GET', 'POST', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization'],
        maxAge: 86400,
    })
)

app.use(express.json({ limit: '64kb' }))

// ── Auth middleware ────────────────────────────────────────────────
function requireAuth(
    req: express.Request,
    res: express.Response,
    next: express.NextFunction
): void {
    if (!SECRET) {
        // No secret configured — skip auth (dev mode)
        next()
        return
    }

    const header = req.headers.authorization
    if (!header || !header.startsWith('Bearer ')) {
        res.status(401).json({ error: 'Missing Authorization header.' })
        return
    }

    const token = header.slice(7)
    if (token !== SECRET) {
        res.status(403).json({ error: 'Invalid token.' })
        return
    }

    next()
}

// ── GET /voices ────────────────────────────────────────────────────
app.get('/voices', (_req, res) => {
    res.json({
        voices: getVoices().map(v => ({
            id: v.id,
            name: v.name,
            lang: v.lang,
        })),
        defaultVoiceId: getDefaultVoiceId(),
    })
})

// ── GET /health ────────────────────────────────────────────────────
app.get('/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

// ── POST /tts ──────────────────────────────────────────────────────
app.post('/tts', requireAuth, async (req, res) => {
    try {
        const { text, voiceId, rate } = req.body as {
            text?: string
            voiceId?: string
            rate?: number
        }

        if (!text || typeof text !== 'string' || !text.trim()) {
            res.status(400).json({ error: 'Missing or empty "text" field.' })
            return
        }

        if (text.length > 5000) {
            res.status(400).json({ error: 'Text too long (max 5000 chars).' })
            return
        }

        const voice = resolveVoice(voiceId, MODELS_DIR, PIPER_BIN)
        if (!voice) {
            res.status(503).json({ error: 'No voices configured on server.' })
            return
        }

        const safeRate = typeof rate === 'number' && rate > 0 ? rate : 1.0

        const result = await synthesize(text.trim(), voice, safeRate)

        res.set({
            'Content-Type': result.contentType,
            'Cache-Control': 'no-store',
            'Content-Length': String(result.audio.length),
        })
        res.send(result.audio)
    } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown TTS error'
        console.error('[TTS ERROR]', message)
        res.status(500).json({ error: message })
    }
})

// ── Start ──────────────────────────────────────────────────────────
app.listen(PORT, '127.0.0.1', () => {
    console.log(`clevertree-tts-server listening on 127.0.0.1:${PORT}`)
    console.log(`Piper binary: ${PIPER_BIN}`)
    console.log(`Models dir:   ${MODELS_DIR}`)
    console.log(`Allowed origins: ${ALLOWED_ORIGINS.join(', ') || '(all)'}`)
    console.log(`Auth: ${SECRET ? 'enabled' : 'DISABLED (no secret set)'}`)
})
