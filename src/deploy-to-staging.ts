import chalk from 'chalk';
import { Client } from 'ssh2';

import { sshExecCommand } from './ssh-exec-cmd';

export async function deployToStaging({
    sshClient,
    stagingDir,
    remoteFilePath,
    progress,
    succeed
}: {
    progress: (text: string) => void;
    sshClient: Client;
    stagingDir: string;
    remoteFilePath: string;
    succeed: (text: string) => void;
}): Promise<void> {
    const startTime = new Date().getTime();
    progress('Deploying to staging...');
    await sshExecCommand(sshClient, 'rm', ['-rf', stagingDir]);
    await sshExecCommand(sshClient, 'mkdir', ['-p', stagingDir]);
    await sshExecCommand(sshClient, 'tar', ['xf', remoteFilePath, '-C', stagingDir]);
    await sshExecCommand(sshClient, 'rm', ['-v', remoteFilePath]);
    const elapsed = 0.001 * (new Date().getTime() - startTime);
    succeed(`Deploy to staging successful: ${chalk.green(stagingDir)} ${chalk.gray(`[${elapsed.toFixed(1)}s]`)}`);
}
