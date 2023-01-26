#!/usr/bin/env node
import chalk from 'chalk';
import fs from 'fs-extra';
import path from 'path';
import SftpClient from 'ssh2-sftp-client';
import tmp from 'tmp-promise';

import { compressDirectory } from './compress-directory';
import { deployToStaging } from './deploy-to-staging';
import { swapStagingWithProduction } from './swap-staging-with-production';
import { SftpDeployConfig } from './types/config';
import { SftpClientWithSsh } from './types/sftp-client-with-ssh';
import { uploadFile } from './upload-file';
import { noop } from './util/noop';

/**
 * Deploys the contents of a directory via SFTP to a remote directory.
 * @param config The deployment configuration
 */
export async function sftpDeployer(config: SftpDeployConfig): Promise<void> {
    const progress = config.progress || noop;
    const succeed = config.succeed || noop;
    const {
        host,
        port = 22,
        username,
        localDir,
        targetDir,
        uploadDir,
        privateKeyPassword: passphrase
    } = config;
    const stagingDir = config.stagingDir ?? `${config.targetDir}.staging`;

    // Create temp filename
    const tempFile = await tmp.file({
        prefix: 'upload-',
        postfix: '.tar.gz'
    });

    try {
        // Compress the folder to the temp file
        await compressDirectory({
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
                : await fs.readFile(
                      path.resolve(localDir, config.privateKeyFile),
                      {
                          encoding: 'utf-8'
                      }
                  );
        const sftpClient = new SftpClient() as SftpClientWithSsh;

        const startConnect = new Date().getTime();
        await sftpClient.connect({
            host,
            username,
            port,
            privateKey,
            passphrase
        });
        const sshClient = sftpClient.client;
        const elapsedConnect = 0.001 * (new Date().getTime() - startConnect);
        succeed(
            `Connected to ${chalk.cyan(`${host}:${port}`)} ${chalk.gray(
                `[${elapsedConnect.toFixed(1)}s]`
            )}`
        );

        try {
            const remoteFilePath = `${uploadDir}/build-${new Date().getTime()}.tar.gz`;

            await uploadFile({
                sftpClient,
                localFilePath: tempFile.path,
                remoteFilePath,
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

            await swapStagingWithProduction({
                sftpClient,
                targetDir,
                stagingDir,
                progress,
                succeed
            });
        } finally {
            await sftpClient.end();
        }
    } finally {
        await tempFile.cleanup();
    }
}
