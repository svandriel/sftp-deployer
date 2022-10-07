import { Client } from 'ssh2';
import SftpClient from 'ssh2-sftp-client';

export interface SftpClientWithSsh extends SftpClient {
    client: Client;
}
