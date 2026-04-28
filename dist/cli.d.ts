import type { SearchQuery } from './contracts.js';
interface CliOptions {
    version?: boolean;
    query?: SearchQuery;
}
export declare function run(argv: string[], io?: {
    stdout: NodeJS.WriteStream & {
        fd: 1;
    };
    stderr: NodeJS.WriteStream & {
        fd: 2;
    };
}): Promise<number>;
export declare function parseArgs(argv: string[]): CliOptions;
export {};
