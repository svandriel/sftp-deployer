import chalk from 'chalk';
import fs from 'fs-extra';
import SftpClient from 'ssh2-sftp-client';
import tmp from 'tmp-promise';

import { uploadFile } from './upload-file';

describe('uploadFile', () => {
    let tempFile: tmp.FileResult;
    beforeEach(async () => {
        tempFile = await tmp.file({
            prefix: 'test'
        });
        await fs.writeFile(tempFile.path, 'Testing one two');
    });
    afterEach(async () => {
        if (tempFile) {
            tempFile.cleanup();
        }
    });
    it('works', async () => {
        const progress = jest.fn();
        const succeed = jest.fn();

        let step: (totalTransferred: number) => void = () => {
            /* no-op */
        };
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const fastPut = jest.fn(async (_localFile, _remoteFile, _opts) => {
            /* no-op */
            step = _opts.step;
        });
        const sftpClient = {
            fastPut
        } as unknown as SftpClient;
        await uploadFile({
            sftpClient,
            localFilePath: tempFile.path,
            remoteFilePath: '/remote/file.zip',
            progress,
            succeed
        });

        expect(fastPut).toHaveBeenCalledTimes(1);

        // Check the fastput call
        const firstCall = fastPut.mock.calls[0];
        expect(firstCall[0]).toBe(tempFile.path);
        expect(firstCall[1]).toBe('/remote/file.zip');
        expect(typeof firstCall[2].step).toBe('function');

        // Invoke the step function
        step(0);
        step(4);
        step(15);

        // Check the progress and succeed calls
        expect(progress).toHaveBeenCalledTimes(4);
        expect(progress).toHaveBeenNthCalledWith(1, 'Uploading...');
        expect(progress).toHaveBeenNthCalledWith(2, `Uploading... ${chalk.bold('0%')} [${chalk.cyan('0B')}]`);
        expect(progress).toHaveBeenNthCalledWith(3, `Uploading... ${chalk.bold('27%')} [${chalk.cyan('4B')}]`);
        expect(progress).toHaveBeenNthCalledWith(4, `Uploading... ${chalk.bold('100%')} [${chalk.cyan('15B')}]`);
        expect(succeed).toHaveBeenCalledWith(`Upload successful ${chalk.gray('[0.0s]')}`);
    });
});
