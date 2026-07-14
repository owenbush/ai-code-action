export interface OutputOptions {
    text: string;
    json?: string;
    comment: boolean;
    githubToken: string;
}
export declare function writeOutput(options: OutputOptions): Promise<void>;
