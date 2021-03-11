#!/usr/bin/env node
import bytes from 'bytes';
import chalk from 'chalk';
import fs from 'fs-extra';
import path from 'path';
import { Client } from 'ssh2';
import SshClient from 'ssh2-sftp-client';
import tar from 'tar';
import tmp from 'tmp-promise';

import { SftpDeployConfig } from './config';

/**
 * Supersnel upload script.
 *
 * - Zipt de 'build' folder
 * - Upload het zip bestand via SSH naar een server
 * - Unzip daar naar een tijdelijke staging directory
 * - Verwisselt de doel directory met de staging directory
 */
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
    progress(`Compressing ${chalk.cyan(path.relative(process.cwd(), buildDir))} directory...`);
    await tar.c(
        {
            gzip: true,
            file: tempFile.path,
            cwd: buildDir
        },
        ['.']
    );
    const tarStat = await fs.stat(tempFile.path);
    const fileSize = tarStat.size;
    succeed(`Compressed build folder: ${chalk.cyan(bytes(fileSize))}`);

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
        await execCommand(sshClient, `rm -rf "${remoteStagingDir}"`);
        await execCommand(sshClient, `mkdir -p "${remoteStagingDir}"`);
        await execCommand(sshClient, `tar xf "${remoteFilePath}" -C "${remoteStagingDir}"`);
        await execCommand(sshClient, `rm -v "${remoteFilePath}"`);
        succeed(`Deploy to staging successful: ${chalk.green(remoteStagingDir)}`);

        progress('Swapping staging and production...');
        const targetDirExists = !!(await sftpClient.exists(remoteTargetDir));
        if (targetDirExists) {
            await execCommand(sshClient, `mv "${remoteTargetDir}" "${remoteTargetDir}.old"`);
        }
        await execCommand(sshClient, `mv "${remoteStagingDir}" "${remoteTargetDir}"`);
        if (targetDirExists) {
            await execCommand(sshClient, `rm -rf "${remoteTargetDir}.old"`);
        }
        succeed('Upload successful');
        await execCommand(sshClient, `rm -rf "${remoteTargetDir}"`);
    } finally {
        await tempFile.cleanup();
        await sftpClient.end();
    }
}

/**
 * Executes a command on an (open) SSH2 client
 * @param conn The open SSH2 connection
 * @param cmd Command to execute
 * @returns
 */
function execCommand(
    conn: Client,
    cmd: string
): Promise<{
    stdout: string;
    stderr: string;
}> {
    //   console.log(chalk.gray(`\n> ${cmd}`));
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

function noop(): void {
    // does noething
}
