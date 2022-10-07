import chalk from 'chalk';

import { sshExecCommand } from './ssh-exec-cmd';
import { SftpClientWithSsh } from './types/sftp-client-with-ssh';

export interface SwapStagingWithProductionOptions {
    sftpClient: SftpClientWithSsh;
    targetDir: string;
    stagingDir: string;
    progress: (text: string) => void;
    succeed: (text: string) => void;
}

export async function swapStagingWithProduction({
    sftpClient,
    targetDir,
    stagingDir,
    progress,
    succeed
}: SwapStagingWithProductionOptions): Promise<void> {
    const sshClient = sftpClient.client;
    progress('Swapping staging and production...');
    const targetDirExists = !!(await sftpClient.exists(targetDir));
    if (targetDirExists) {
        await sshExecCommand(sshClient, 'mv', [targetDir, `${targetDir}.old`]);
    }
    await sshExecCommand(sshClient, 'mv', [stagingDir, targetDir]);
    if (targetDirExists) {
        await sshExecCommand(sshClient, 'rm', ['-rf', `${targetDir}.old`]);
    }
    succeed(`Upload successful: ${chalk.green(targetDir)}`);
}
