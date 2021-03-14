#!/usr/bin/env node
import chalk from 'chalk';
import fs from 'fs-extra';
import path from 'path';
import { Client } from 'ssh2';
import SshClient from 'ssh2-sftp-client';
import tmp from 'tmp-promise';

import { compressDirectory } from './compress-directory';
import { deployToStaging } from './deploy-to-staging';
import { sshExecCommand } from './ssh-exec-cmd';
import { SftpDeployConfig } from './types/config';
import { uploadFile } from './upload-file';
import { noop } from './util/noop';

export async function sftpDeployer(config: SftpDeployConfig): Promise<void> {
    const progress = config.progress || noop;
    const succeed = config.succeed || noop;
    const { host, port, username, localDir, stagingDir, targetDir, uploadDir } = config;

    // Create temp filename
    const tempFile = await tmp.file({
        prefix: 'upload-',
        postfix: '.tar.gz'
    });

    try {
        // Compress the folder to the temp file
        const fileSize = await compressDirectory({
            sourceDir: localDir,
            targetFile: tempFile.path,
            progress,
            succeed
        });

        // Connect to the SSH server
        progress(`Connecting to ${chalk.cyan(`${host}:${port}`)}...`);
        const privateKey =
            'privateKey' in config
                ? config.privateKey
                : await fs.readFile(path.resolve(localDir, config.privateKeyFile), {
                      encoding: 'utf-8'
                  });
        const sftpClient = new SshClient();

        await sftpClient.connect({
            host,
            username,
            port,
            privateKey
        });
        const sshClient = (sftpClient as any).client as Client;
        succeed(`Connected to ${chalk.cyan(`${host}:${port}`)}`);

        try {
            const remoteFilePath = path.join(uploadDir, `build-${new Date().getTime()}.tar.gz`).replace(path.sep, '/');

            await uploadFile({
                sftpClient,
                localFilePath: tempFile.path,
                remoteFilePath,
                fileSize,
                progress,
                succeed
            });

            await deployToStaging({
                sshClient,
                stagingDir,
                remoteFilePath,
                progress,
                succeed
            });

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
        } finally {
            await sftpClient.end();
        }
    } finally {
        console.log('removing ', tempFile.path);
        await tempFile.cleanup();
    }
}
