import bytes from 'bytes';
import chalk from 'chalk';
import fs from 'fs-extra';
import path from 'path';
import tar from 'tar';

import { noop } from './util/noop';

export interface CompressDirectoryOptions {
    sourceDir: string;
    targetFile: string;
    progress?: (str: string) => void;
    succeed?: (str: string) => void;
}

export async function compressDirectory({
    sourceDir,
    targetFile,
    progress = noop,
    succeed = noop
}: CompressDirectoryOptions): Promise<void> {
    progress(
        `Compressing ${chalk.cyan(
            path.relative(process.cwd(), sourceDir)
        )} directory...`
    );
    await tar.c(
        {
            gzip: true,
            file: targetFile,
            cwd: sourceDir
        },
        ['.']
    );
    const tarStat = await fs.stat(targetFile);
    const fileSize = tarStat.size;
    succeed(`Compressed build folder: ${chalk.cyan(bytes(fileSize))}`);
}
