import chalk from 'chalk';
import { program } from 'commander';
import fs from 'fs-extra';
import ora from 'ora';
import path from 'path';
import { inspect } from 'util';

import { sftpDeployer } from '..';
import { CmdOptions } from '../types/cmd-options';
import { SftpDeployConfig, SftpDeployConfigBase } from '../types/config';

const pkgPath = path.join(__dirname, '..', '..', 'package.json');
const descriptionPath = path.join(__dirname, '..', '..', 'cmd-description.txt');
const pkg = fs.readJsonSync(pkgPath);
const description = fs.readFileSync(descriptionPath).toString().trim();

const CONFIG_FILENAME = '.sftp.json';

program
    .name(pkg.name)
    .description(`${pkg.description}\n\n${description}`)
    .version(pkg.version)
    .option('-h, --host <host>', 'hostname to connect to')
    .option('-p, --port <port>', 'SSH port to use (defaults to 22)', x => Number.parseInt(x, 10))
    .option('-u, --user <username>', 'the ssh username')
    .option('-k, --key <key_or_file>', 'path to private key file, or private key itself')
    .option('-l, --local <path>', 'directory to upload')
    .option('-t, --target <target_dir>', 'target directory on remote host')
    .option(
        '-s, --staging <staging_dir>',
        'staging directory on remote host (defaults to the target directory + .staging)'
    )
    .option('-u, --upload <upload_dir>', 'upload directory on remote host', '/var/tmp')
    .parse(process.argv);

const opts = program.opts() as Partial<CmdOptions>;

const spinner = ora();
main(opts)
    .then(() => {
        spinner.stop();
    })
    .catch(err => {
        console.error(inspect(err));
        process.exit(1);
    });

async function main(opts: Partial<CmdOptions>): Promise<void> {
    const validatedOptions = await validateOptions(opts);

    // Determine if the 'key' property is a file or an actual private key
    const isKey = /^-----BEGIN OPENSSH PRIVATE KEY-----/.test(validatedOptions.key);

    const configBase: SftpDeployConfigBase = {
        host: validatedOptions.host,
        port: validatedOptions.port ?? 22,
        username: validatedOptions.user,
        localDir: validatedOptions.local,
        targetDir: validatedOptions.target,
        stagingDir: validatedOptions.staging || `${validatedOptions.target}.staging`,
        uploadDir: validatedOptions.upload,
        progress: x => spinner.start(x),
        succeed: y => spinner.succeed(y)
    };
    const privateKeyDisplay = isKey ? 'Directly provided' : path.resolve(process.cwd(), validatedOptions.key);
    const config: SftpDeployConfig = isKey
        ? {
              ...configBase,
              privateKey: validatedOptions.key
          }
        : {
              ...configBase,
              privateKeyFile: path.resolve(process.cwd(), validatedOptions.key)
          };

    console.log(`Running SFTP deploy: ${chalk.cyan(`${config.username}@${config.host}:${config.port}`)}`);
    console.log(`- Local directory: ${chalk.green(config.localDir)}`);
    console.log(`- Target directory: ${chalk.green(config.targetDir)}`);
    console.log(`- Staging directory: ${chalk.green(config.stagingDir)}`);
    console.log(`- Upload directory: ${chalk.green(config.uploadDir)}`);
    console.log(`- Private key: ${chalk.green(privateKeyDisplay)}`);
    console.log();
    await sftpDeployer(config);
}

async function validateOptions(opts: Partial<CmdOptions>): Promise<CmdOptions> {
    const configFromFile = await loadConfigFromFile();
    const mergedOptions = {
        ...configFromFile,
        ...removeUndefineds(opts)
    } as CmdOptions;

    return {
        host: requireProp(mergedOptions, 'host'),
        port: requireProp(mergedOptions, 'port'),
        user: requireProp(mergedOptions, 'user'),
        key: requireProp(mergedOptions, 'key'),
        local: requireProp(mergedOptions, 'local'),
        target: requireProp(mergedOptions, 'target'),
        staging: mergedOptions.staging,
        upload: requireProp(mergedOptions, 'upload')
    };
}

async function loadConfigFromFile(): Promise<Partial<CmdOptions>> {
    try {
        return await fs.readJSON(path.join(process.cwd(), CONFIG_FILENAME));
    } catch (err) {
        if (err.code === 'ENOENT') {
            return {};
        }
        throw err;
    }
}

function requireProp<T, K extends keyof T>(obj: T, propName: K): T[K] {
    if (!obj[propName]) {
        throw new Error(`Missing --${propName}. Use --help for syntax help`);
    }
    return obj[propName];
}

function removeUndefineds<T>(obj: T): T {
    const result: any = {};
    Object.entries(obj).map(([key, value]) => {
        if (typeof value !== 'undefined') {
            result[key] = value;
        }
    });

    return result as T;
}
