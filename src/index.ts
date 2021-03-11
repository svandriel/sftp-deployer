#!/usr/bin/env node
import bytes from 'bytes';
import chalk from 'chalk';
import fs from 'fs-extra';
import path from 'path';
import { Client } from 'ssh2';
import SshClient from 'ssh2-sftp-client';
import tmp from 'tmp-promise';

import { compressDirectory } from './compress-directory';
import { sshExecCommand } from './ssh-exec-cmd';
import { SftpDeployConfig } from './types/config';
import { noop } from './util/noop';

const rootDir = path.resolve(__dirname, '..');

export async function sftpDeployer(config: SftpDeployConfig): Promise<void> {
    const progress = config.progress || noop;
    const succeed = config.succeed || noop;

    // Create temp filename
    const tempFile = await tmp.file({
        prefix: 'upload-',
        postfix: '.tar.gz'
    });
    const buildDir = path.join(rootDir, config.localDir);

    // Compress the folder to the temp file
    const fileSize = await compressDirectory({ sourceDir: buildDir, targetFile: tempFile.path, progress, succeed });

    // Connect to the SSH server
    progress(`Connecting to ${chalk.cyan(`${config.host}:${config.port}`)}...`);
    const privateKey =
        'privateKey' in config
            ? config.privateKey
            : await fs.readFile(path.resolve(rootDir, config.privateKeyFile), {
                  encoding: 'utf-8'
              });
    const sftpClient = new SshClient();

    await sftpClient.connect({
        host: config.host,
        username: config.username,
        port: config.port,
        privateKey
    });
    const sshClient = (sftpClient as any).client as Client;
    succeed(`Connected to ${chalk.cyan(`${config.host}:${config.port}`)}`);

    try {
        const remoteFilePath = path
            .join(config.uploadDir, `build-${new Date().getTime()}.tar.gz`)
            .replace(path.sep, '/');
        const remoteStagingDir = config.stagingDir.replace(path.sep, '/').replace(/"/g, '\\"');
        const remoteTargetDir = config.targetDir.replace(path.sep, '/').replace(/"/g, '\\"');

        // Upload single file
        progress('Uploading...');
        const startUpload = new Date().getTime();
        await sftpClient.fastPut(tempFile.path, remoteFilePath, {
            step(totalTransferred) {
                const percentage = `${((100 * totalTransferred) / fileSize).toFixed(0)}%`;
                progress(`Uploading... ${chalk.bold(percentage)} [${chalk.cyan(`${bytes(totalTransferred)}`)}]`);
            }
        });
        const elapsedUpload = 0.001 * (new Date().getTime() - startUpload);
        succeed(`Upload successful ${chalk.gray(`[${elapsedUpload.toFixed(1)}s]`)}`);

        progress('Deploying to staging...');
        await sshExecCommand(sshClient, `rm -rf "${remoteStagingDir}"`);
        await sshExecCommand(sshClient, `mkdir -p "${remoteStagingDir}"`);
        await sshExecCommand(sshClient, `tar xf "${remoteFilePath}" -C "${remoteStagingDir}"`);
        await sshExecCommand(sshClient, `rm -v "${remoteFilePath}"`);
        succeed(`Deploy to staging successful: ${chalk.green(config.stagingDir)}`);

        progress('Swapping staging and production...');
        const targetDirExists = !!(await sftpClient.exists(remoteTargetDir));
        if (targetDirExists) {
            await sshExecCommand(sshClient, `mv "${remoteTargetDir}" "${remoteTargetDir}.old"`);
        }
        await sshExecCommand(sshClient, `mv "${remoteStagingDir}" "${remoteTargetDir}"`);
        if (targetDirExists) {
            await sshExecCommand(sshClient, `rm -rf "${remoteTargetDir}.old"`);
        }
        succeed(`Upload successful: ${chalk.green(config.targetDir)}`);
        await sshExecCommand(sshClient, `rm -rf "${remoteTargetDir}"`);
    } finally {
        await tempFile.cleanup();
        await sftpClient.end();
    }
}
