export interface VoiceConfig {
    id: string
    name: string
    lang: string
    modelFile: string
    configFile?: string
}

export interface ResolvedVoice {
    id: string
    name: string
    lang: string
    modelPath: string
    configPath: string | null
    binPath: string
}

const VOICES: VoiceConfig[] = [
    // ── en_US (medium) ────────────────────────────────────────────
    { id: 'en_US-lessac-medium', name: 'Lessac (US)', lang: 'en_US', modelFile: 'en_US-lessac-medium.onnx' },
    { id: 'en_US-amy-medium', name: 'Amy (US)', lang: 'en_US', modelFile: 'en_US-amy-medium.onnx' },
    { id: 'en_US-arctic-medium', name: 'Arctic (US)', lang: 'en_US', modelFile: 'en_US-arctic-medium.onnx' },
    { id: 'en_US-bryce-medium', name: 'Bryce (US)', lang: 'en_US', modelFile: 'en_US-bryce-medium.onnx' },
    { id: 'en_US-hfc_female-medium', name: 'HFC Female (US)', lang: 'en_US', modelFile: 'en_US-hfc_female-medium.onnx' },
    { id: 'en_US-hfc_male-medium', name: 'HFC Male (US)', lang: 'en_US', modelFile: 'en_US-hfc_male-medium.onnx' },
    { id: 'en_US-joe-medium', name: 'Joe (US)', lang: 'en_US', modelFile: 'en_US-joe-medium.onnx' },
    { id: 'en_US-john-medium', name: 'John (US)', lang: 'en_US', modelFile: 'en_US-john-medium.onnx' },
    { id: 'en_US-kristin-medium', name: 'Kristin (US)', lang: 'en_US', modelFile: 'en_US-kristin-medium.onnx' },
    { id: 'en_US-kusal-medium', name: 'Kusal (US)', lang: 'en_US', modelFile: 'en_US-kusal-medium.onnx' },
    { id: 'en_US-l2arctic-medium', name: 'L2 Arctic (US)', lang: 'en_US', modelFile: 'en_US-l2arctic-medium.onnx' },
    { id: 'en_US-libritts_r-medium', name: 'LibriTTS-R (US)', lang: 'en_US', modelFile: 'en_US-libritts_r-medium.onnx' },
    { id: 'en_US-ljspeech-medium', name: 'LJ Speech (US)', lang: 'en_US', modelFile: 'en_US-ljspeech-medium.onnx' },
    { id: 'en_US-norman-medium', name: 'Norman (US)', lang: 'en_US', modelFile: 'en_US-norman-medium.onnx' },
    { id: 'en_US-reza_ibrahim-medium', name: 'Reza Ibrahim (US)', lang: 'en_US', modelFile: 'en_US-reza_ibrahim-medium.onnx' },
    { id: 'en_US-ryan-medium', name: 'Ryan (US)', lang: 'en_US', modelFile: 'en_US-ryan-medium.onnx' },
    { id: 'en_US-sam-medium', name: 'Sam (US)', lang: 'en_US', modelFile: 'en_US-sam-medium.onnx' },
    // ── en_US (non-medium — only quality available) ───────────────
    { id: 'en_US-danny-low', name: 'Danny (US)', lang: 'en_US', modelFile: 'en_US-danny-low.onnx' },
    { id: 'en_US-kathleen-low', name: 'Kathleen (US)', lang: 'en_US', modelFile: 'en_US-kathleen-low.onnx' },
    { id: 'en_US-libritts-high', name: 'LibriTTS (US, High)', lang: 'en_US', modelFile: 'en_US-libritts-high.onnx' },
    // ── en_GB (medium) ────────────────────────────────────────────
    { id: 'en_GB-alan-medium', name: 'Alan (GB)', lang: 'en_GB', modelFile: 'en_GB-alan-medium.onnx' },
    { id: 'en_GB-alba-medium', name: 'Alba (GB)', lang: 'en_GB', modelFile: 'en_GB-alba-medium.onnx' },
    { id: 'en_GB-aru-medium', name: 'Aru (GB)', lang: 'en_GB', modelFile: 'en_GB-aru-medium.onnx' },
    { id: 'en_GB-cori-medium', name: 'Cori (GB)', lang: 'en_GB', modelFile: 'en_GB-cori-medium.onnx' },
    { id: 'en_GB-jenny_dioco-medium', name: 'Jenny DioCo (GB)', lang: 'en_GB', modelFile: 'en_GB-jenny_dioco-medium.onnx' },
    { id: 'en_GB-northern_english_male-medium', name: 'Northern English Male (GB)', lang: 'en_GB', modelFile: 'en_GB-northern_english_male-medium.onnx' },
    { id: 'en_GB-semaine-medium', name: 'Semaine (GB)', lang: 'en_GB', modelFile: 'en_GB-semaine-medium.onnx' },
    { id: 'en_GB-vctk-medium', name: 'VCTK (GB)', lang: 'en_GB', modelFile: 'en_GB-vctk-medium.onnx' },
    // ── en_GB (non-medium) ────────────────────────────────────────
    { id: 'en_GB-southern_english_female-low', name: 'Southern English Female (GB)', lang: 'en_GB', modelFile: 'en_GB-southern_english_female-low.onnx' },
]

export function getVoices(): VoiceConfig[] {
    return VOICES
}

export function getDefaultVoiceId(): string | null {
    return VOICES[0]?.id ?? null
}

export function resolveVoice(
    voiceId: string | undefined,
    modelsDir: string,
    binPath: string
): ResolvedVoice | null {
    const selected = VOICES.find(v => v.id === voiceId) ?? VOICES[0]
    if (!selected) return null

    const modelPath = `${modelsDir}/${selected.modelFile}`
    const configFile = selected.configFile ?? `${selected.modelFile}.json`
    const configPath = `${modelsDir}/${configFile}`

    return {
        id: selected.id,
        name: selected.name,
        lang: selected.lang,
        modelPath,
        configPath,
        binPath,
    }
}
