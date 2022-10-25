import { EventEmitter } from 'events';
import { Client, ClientChannel } from 'ssh2';
import * as stream from 'stream';
import { sshExecCommand } from './ssh-exec-cmd';
import { tick } from './util/tick';

describe('sshExecCommand', () => {
    it('works', async () => {
        const stdout = new EventEmitter() as ClientChannel;
        stdout.stderr = new EventEmitter() as stream.Readable;
        const exec = jest.fn().mockImplementation((_commandLine, callback) => {
            callback(null, stdout);
        });
        const client = {
            exec
        } as unknown as Client;
        const resultPromise = sshExecCommand(client, 'ls', ['-la']);

        await tick();
        stdout.emit('data', Buffer.from('Standard out', 'utf-8'));
        stdout.stderr.emit('data', Buffer.from('Standard error', 'utf-8'));
        stdout.emit('close', 0);

        const result = await resultPromise;
        expect(exec).toHaveBeenCalledTimes(1);
        expect(exec.mock.calls.length).toBe(1);
        expect(exec.mock.calls[0][0]).toBe('ls -la');
        expect(result).toEqual({
            stdout: 'Standard out',
            stderr: 'Standard error'
        });
    });

    it('fails when command fails', async () => {
        const stdout = new EventEmitter() as ClientChannel;
        stdout.stderr = new EventEmitter() as stream.Readable;
        const exec = jest.fn().mockImplementation((_commandLine, callback) => {
            callback(new Error('fail'));
        });
        const client = {
            exec
        } as unknown as Client;

        await expect(sshExecCommand(client, 'ls', ['-la'])).rejects.toEqual(new Error('fail'));
    });

    it('fails on non-zero exit code', async () => {
        const stdout = new EventEmitter() as ClientChannel;
        stdout.stderr = new EventEmitter() as stream.Readable;
        const exec = jest.fn().mockImplementation((_commandLine, callback) => {
            callback(null, stdout);
        });
        const client = {
            exec
        } as unknown as Client;
        const resultPromise = sshExecCommand(client, 'ls', ['-la']);

        await tick();
        stdout.emit('data', Buffer.from('Standard out', 'utf-8'));
        stdout.stderr.emit('data', Buffer.from('Standard error', 'utf-8'));
        stdout.emit('close', -1);

        const expected = new Error('Command returned non-zero error code: -1 (signal: undefined)');
        Object.assign(expected, {
            stdout: 'Standard out',
            stderr: 'Standard error',
            code: -1,
            cmd: 'ls -la'
        });

        await expect(resultPromise).rejects.toThrow(expected);
    });
});
