import { spawn } from 'node:child_process'

export type ProcessOutput = {
    code: number
    stdout: string
    stderr: string
}

export function runProcessWithOutput(command: string, args: string[]): Promise<ProcessOutput> {
    return new Promise((resolve, reject) => {
        let stdout: string = ''
        let stderr: string = ''

        const process = spawn(command, args, {stdio: 'pipe'})

        process.stdout.on('data', (data) => { stdout += data.toString() })
        process.stderr.on('data', (data) => { stderr += data.toString() })
        process.on('close', (code) => {
            resolve({code: code ?? -1, stdout, stderr})
        })
        process.on('error', reject)
    })
}