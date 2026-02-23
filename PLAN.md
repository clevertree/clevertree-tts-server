# clevertree-tts-server — Build Plan

A lightweight self-hosted Piper TTS microservice intended to run on a Linode $5/mo
Nanode instance, callable from whitelisted web properties (paradigm-threat-site, etc.).

---

## 1. Linode Instance

| Setting | Value |
|---|---|
| **Plan** | Nanode 1 GB ($5/mo) |
| **Distro** | **Ubuntu 24.04 LTS** |
| **Region** | Closest to you (e.g. us-east, us-central) |
| **Label** | `clevertree-tts` |

**Why Ubuntu 24.04 LTS?**
- Piper's official prebuilt binaries target Debian/Ubuntu (`amd64`)
- `apt` has all runtime deps (`libc`, `libstdc++`, `libonnxruntime`) already packaged
- LTS = security patches through 2029, no surprise distro EOLs
- Wide community support for Node.js, systemd, nginx, certbot

---

## 2. Architecture

```
Client (browser / Vercel Next.js)
        │  HTTPS POST /tts  (with Bearer token + Origin check)
        ▼
  nginx  (TLS termination, rate limiting, CORS origin whitelist)
        │
        ▼
  Node.js Express app  (port 3100, internal only)
        │  spawns
        ▼
  piper binary  (reads model from disk, writes WAV to stdout)
        │
        ▼
  Response: audio/wav  streamed back to client
```

- **nginx** handles TLS (Let's Encrypt / certbot), rate limiting, and CORS Origin whitelisting
- **Express** handles auth (Bearer token), input validation, and spawning Piper
- **Piper** is the official prebuilt binary (no GPU, CPU-only, fast)

---

## 3. Project Structure

```
clevertree-tts-server/
├── PLAN.md                  ← this file
├── package.json
├── tsconfig.json
├── .env.example
├── src/
│   ├── index.ts             ← Express app entry point
│   ├── tts.ts               ← Piper spawn logic
│   └── voices.ts            ← Voice registry (id → model path)
├── voices/                  ← ONNX model files (gitignored, downloaded on server)
│   └── .gitkeep
├── scripts/
│   └── install-piper.sh     ← Downloads Piper binary + models
└── deploy/
    ├── nginx.conf            ← nginx site config with CORS whitelist
    ├── tts.service           ← systemd unit for the Node app
    └── setup.sh             ← Full server bootstrap script
```

---

## 4. API

### `POST /tts`

**Headers:**
```
Authorization: Bearer <CLEVERTREE_TTS_SECRET>
Content-Type: application/json
Origin: https://paradigm-threat-site.vercel.app   ← must be in whitelist
```

**Body:**
```json
{
  "text": "The quick brown fox.",
  "voiceId": "en_US-lessac-medium",
  "rate": 1.0
}
```

**Response:** `audio/wav` binary stream (200) or JSON error (400/401/403/500)

### `GET /voices`

Returns available voice list (no auth required, origin-restricted):
```json
{
  "voices": [
    { "id": "en_US-lessac-medium", "name": "Lessac (US)", "lang": "en_US" }
  ],
  "defaultVoiceId": "en_US-lessac-medium"
}
```

---

## 5. CORS / Origin Whitelist

Configured in **nginx** (not the app) so it applies at the network edge:

```nginx
# deploy/nginx.conf (excerpt)
map $http_origin $cors_origin {
    default                                    "";
    "https://paradigm-threat-site.vercel.app"  "$http_origin";
    "https://paradigm-threat.com"              "$http_origin";
    "http://localhost:3000"                    "$http_origin";
    "http://localhost:3001"                    "$http_origin";
}
```

Any request with an Origin not in the map gets a `403 Forbidden` before it reaches Node.

The Express app also validates `Origin` as a second layer.

---

## 6. Auth

- Single shared **Bearer token** stored in `.env` as `CLEVERTREE_TTS_SECRET`
- Calling sites set it as an env var (e.g. `NEXT_PUBLIC_TTS_SECRET` or server-side only)
- Token is generated with `openssl rand -hex 32` at deploy time
- Future: per-site tokens with a simple token→allowedOrigins map

---

## 7. Piper Voices

Initial voice set (download ~150MB total):

| ID | Description | Size |
|---|---|---|
| `en_US-lessac-medium` | US English, natural male | ~60MB |
| `en_US-amy-medium` | US English, female | ~60MB |

Downloaded by `scripts/install-piper.sh` into `voices/` on the server.
Models are **not committed to git** (too large) — script pulls from HuggingFace.

---

## 8. Rate Limiting

nginx limits per IP:
- **10 requests/minute** for `/tts` (synthesis is CPU-bound)
- **60 requests/minute** for `/voices`

---

## 9. Integration with paradigm-threat-site

In `.env.local` on the Vercel project (or local dev):

```env
CLEVERTREE_TTS_URL=https://tts.clevertree.com
CLEVERTREE_TTS_SECRET=<generated token>
```

The existing `/api/tts/piper/route.ts` can be updated to forward to this server
instead of spawning piper locally, keeping the client-facing API unchanged.

---

## 10. Build Steps (in order)

- [ ] 1. Create Linode Nanode — Ubuntu 24.04 LTS, add SSH key
- [ ] 2. Write `scripts/install-piper.sh` — download binary + voice models
- [ ] 3. Scaffold Express app (`src/index.ts`, `src/tts.ts`, `src/voices.ts`)
- [ ] 4. Write `deploy/nginx.conf` with CORS origin map + rate limits
- [ ] 5. Write `deploy/tts.service` systemd unit
- [ ] 6. Write `deploy/setup.sh` (runs steps 1-5 on a fresh Ubuntu 24.04 box)
- [ ] 7. Update `paradigm-threat-site` `/api/tts/piper/route.ts` to proxy to this server
- [ ] 8. Test end-to-end with `curl` + browser
- [ ] 9. Set up DNS (e.g. `tts.clevertree.com`) pointing to Linode IP
- [ ] 10. Add certbot TLS cert for the domain
