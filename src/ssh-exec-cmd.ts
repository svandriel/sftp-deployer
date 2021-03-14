import { Client } from 'ssh2';
import { bashEscape } from './util/bash-escape';

/**
 * Executes a command on an (open) SSH2 client
 * @param conn The open SSH2 connection
 * @param cmd Command to execute
 * @returns The stdout and stderr of the operation
 */
export function sshExecCommand(
    conn: Client,
    cmd: string,
    args: string[] = [],
    verbose = false
): Promise<{
    stdout: string;
    stderr: string;
    verbose?: boolean;
}> {
    const commandLine = `${[cmd, ...args].map(bashEscape).join(' ')}`;
    if (verbose) {
        console.log(`Running ${commandLine}`);
    }

    return new Promise((resolve, reject) => {
        let stdout = '';
        let stderr = '';
        conn.exec(commandLine, (err, stream) => {
            if (err) {
                reject(err);
                return;
            }
            stream
                .on('close', (code: number, signal?: string) => {
                    if (code === 0) {
                        resolve({ stdout, stderr });
                    } else {
                        const error = new Error(`Command returned non-zero error code: ${code} (signal: ${signal})`);
                        Object.assign(error, { stdout, stderr, code, signal, cmd: commandLine });
                        reject(error);
                    }
                })
                .on('data', (data: Buffer) => {
                    stdout += data.toString();
                })
                .stderr.on('data', (data: Buffer) => {
                    stderr += data.toString();
                });
        });
    });
}
