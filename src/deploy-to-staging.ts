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
    progress('Deploying to staging...');
    await sshExecCommand(sshClient, 'rm', ['-rf', stagingDir]);
    await sshExecCommand(sshClient, 'mkdir', ['-p', stagingDir]);
    await sshExecCommand(sshClient, 'tar', ['xf', remoteFilePath, '-C', stagingDir]);
    await sshExecCommand(sshClient, 'rm', ['-v', remoteFilePath]);
    succeed(`Deploy to staging successful: ${chalk.green(stagingDir)}`);
}
