import { EventEmitter } from 'events';
import { Client, ClientChannel } from 'ssh2';
import * as stream from 'stream';
import { sshExecCommand } from './ssh-exec-cmd';

describe('sshExecCommand', () => {
    it('works', async () => {
        const stdout = new EventEmitter() as ClientChannel;
        stdout.stderr = new EventEmitter() as stream.Readable;
        const exec = jest.fn().mockImplementation((_commandLine, callback) => {
            callback(null, stdout);
        });
        const client = ({
            exec
        } as unknown) as Client;
        const resultPromise = sshExecCommand(client, 'ls', ['-la']);

        stdout.emit('data', Buffer.from('Standard out', 'utf-8'));
        stdout.stderr.emit('data', Buffer.from('Standard error', 'utf-8'));
        stdout.emit('close', 0);

        await new Promise(resolve => setTimeout(resolve, 10));

        const result = await resultPromise;
        expect(exec).toHaveBeenCalledTimes(1);
        expect(exec.mock.calls.length).toBe(1);
        expect(exec.mock.calls[0][0]).toBe('ls -la');
        expect(result).toEqual({
            stdout: 'Standard out',
            stderr: 'Standard error'
        });
    });
});
