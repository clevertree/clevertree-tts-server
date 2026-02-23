import { spawn } from 'child_process'
import type { ResolvedVoice } from './voices'

export interface TTSResult {
    audio: Buffer
    contentType: string
}

export function synthesize(
    text: string,
    voice: ResolvedVoice,
    rate: number = 1.0
): Promise<TTSResult> {
    return new Promise((resolve, reject) => {
        const args: string[] = ['--model', voice.modelPath]

        if (voice.configPath) {
            args.push('--config', voice.configPath)
        }

        // Piper uses length_scale (lower = faster). Map rate (higher = faster) to inverse.
        const lengthScale = rate > 0 ? 1 / rate : 1.0
        args.push('--length_scale', String(lengthScale))

        // Output WAV to stdout
        args.push('--output_file', '-')

        const child = spawn(voice.binPath, args, {
            stdio: ['pipe', 'pipe', 'pipe'],
        })

        const stdout: Buffer[] = []
        const stderr: Buffer[] = []

        child.stdout.on('data', (chunk: Buffer) => stdout.push(chunk))
        child.stderr.on('data', (chunk: Buffer) => stderr.push(chunk))

        child.on('error', (err) => {
            reject(new Error(`Piper spawn failed: ${err.message}`))
        })

        child.on('close', (code) => {
            if (code !== 0) {
                const msg = Buffer.concat(stderr).toString('utf-8') || 'Unknown Piper error'
                reject(new Error(`Piper exited with code ${code}: ${msg}`))
                return
            }
            resolve({
                audio: Buffer.concat(stdout),
                contentType: 'audio/wav',
            })
        })

        child.stdin.write(text)
        child.stdin.end()
    })
}
