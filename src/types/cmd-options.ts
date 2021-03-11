export interface CmdOptions {
    host: string;
    port: number;
    user: string;
    key: string;
    local: string;
    target: string;
    staging?: string;
    upload: string;
}
