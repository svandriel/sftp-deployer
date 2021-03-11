import { Client } from 'ssh2';

/**
 * Executes a command on an (open) SSH2 client
 * @param conn The open SSH2 connection
 * @param cmd Command to execute
 * @returns The stdout and stderr of the operation
 */
export function sshExecCommand(
    conn: Client,
    cmd: string
): Promise<{
    stdout: string;
    stderr: string;
}> {
    return new Promise((resolve, reject) => {
        let stdout = '';
        let stderr = '';
        conn.exec(cmd, (err, stream) => {
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
                        Object.assign(error, { stdout, stderr, code, signal, cmd });
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
