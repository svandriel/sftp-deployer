export type SftpDeployConfig = SftpDeployConfigWithPrivateKey | SftpDeployConfigWithPrivateKeyFile;

export interface SftpDeployConfigBase {
    host: string;
    port: number;
    username: string;
    localDir: string;
    targetDir: string;
    stagingDir: string;
    uploadDir: string;
    progress?: (text: string) => void;
    succeed?: (text: string) => void;
}

export interface SftpDeployConfigWithPrivateKey extends SftpDeployConfigBase {
    privateKey: string;
}

export interface SftpDeployConfigWithPrivateKeyFile extends SftpDeployConfigBase {
    privateKeyFile: string;
}
