export type SftpDeployConfig =
    | SftpDeployConfigWithPrivateKey
    | SftpDeployConfigWithPrivateKeyFile;

export interface SftpDeployConfigBase {
    /**
     * The hostname of the SSH/SFTP server.
     */
    host: string;
    /**
     * The port number; defaults to 22.
     */
    port?: number;
    /**
     * The username to login with.
     */
    username: string;
    /**
     * The path to the local directory to be deployed.
     */
    localDir: string;
    /**
     * The path on the remote machine to deploy to.
     * The contents of this directory will be replaced with the contents
     * of the local directory.
     */
    targetDir: string;
    /**
     * The staging directory on the remote machine. This directory will
     * be populated first, before it is being swapped with the target
     * directory. Defaults to the target directory + .staging
     */
    stagingDir?: string;
    /**
     * The directory to upload the compressed file to. Defaults to /var/tmp.
     */
    uploadDir: string;
    /**
     * Callback to print progress messages.
     */
    progress?: (text: string) => void;
    /**
     * Callback to print success messages.
     */
    succeed?: (text: string) => void;
}

export interface SftpDeployConfigWithPrivateKey extends SftpDeployConfigBase {
    /**
     * The private key to use for the SSH/SFTP connection.
     */
    privateKey: string;

    /**
     * The password to the private key
     */
    privateKeyPassword?: string;
}

export interface SftpDeployConfigWithPrivateKeyFile
    extends SftpDeployConfigBase {
    /**
     * The path to the file that holds the private key to use for the SSH/SFTP connection.
     */
    privateKeyFile: string;

    /**
     * The password to the private key
     */
    privateKeyPassword?: string;
}
