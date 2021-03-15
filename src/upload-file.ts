import bytes from 'bytes';
import chalk from 'chalk';
import fs from 'fs-extra';
import SshClient from 'ssh2-sftp-client';

interface UploadFileOpts {
    sftpClient: SshClient;
    localFilePath: string;
    remoteFilePath: string;
    progress: (text: string) => void;
    succeed: (text: string) => void;
}

export async function uploadFile({
    sftpClient,
    localFilePath,
    remoteFilePath,
    progress,
    succeed
}: UploadFileOpts): Promise<void> {
    progress('Uploading...');
    const stat = await fs.stat(localFilePath);
    const fileSize = stat.size;
    const startUpload = new Date().getTime();
    await sftpClient.fastPut(localFilePath, remoteFilePath, {
        step(totalTransferred) {
            const percentage = `${((100 * totalTransferred) / fileSize).toFixed(0)}%`;
            progress(`Uploading... ${chalk.bold(percentage)} [${chalk.cyan(`${bytes(totalTransferred)}`)}]`);
        }
    });
    const elapsedUpload = 0.001 * (new Date().getTime() - startUpload);
    succeed(`Upload successful ${chalk.gray(`[${elapsedUpload.toFixed(1)}s]`)}`);
}
