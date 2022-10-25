import { Client, ClientChannel } from 'ssh2';
import { promisify } from 'util';
import { bashEscape } from './util/bash-escape';

export interface SshCommandResult {
    stdout: string;
    stderr: string;
}

/**
 * Executes a command on an (open) SSH2 client
 * @param conn The open SSH2 connection
 * @param cmd Command to execute
 * @returns The stdout and stderr of the operation
 */
export async function sshExecCommand(
    conn: Client,
    cmd: string,
    args: string[] = [],
    verbose = false
): Promise<SshCommandResult> {
    const commandLine = `${[cmd, ...args].map(bashEscape).join(' ')}`;
    if (verbose) {
        console.log(`Running ${commandLine}`);
    }

    const exec = promisify(conn.exec.bind(conn));
    const channel = await exec(commandLine);
    return handleCommand(channel, commandLine);
}

function handleCommand(stream: ClientChannel, commandLine: string): Promise<SshCommandResult> {
    return new Promise<SshCommandResult>((resolve, reject) => {
        let stdout = '';
        let stderr = '';
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
}
