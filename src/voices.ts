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
    {
        id: 'en_US-lessac-medium',
        name: 'Lessac (US)',
        lang: 'en_US',
        modelFile: 'en_US-lessac-medium.onnx',
    },
    {
        id: 'en_US-amy-medium',
        name: 'Amy (US)',
        lang: 'en_US',
        modelFile: 'en_US-amy-medium.onnx',
    },
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
