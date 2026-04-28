import type { SearchQuery, SearchResponse, SearchResult } from './contracts.js';
export declare class HeroldError extends Error {
    readonly exitCode: number;
    constructor(message: string, exitCode?: number);
}
export declare function buildSearchUrl(query: SearchQuery): string;
export declare function searchHerold(query: SearchQuery, fetchImpl?: typeof fetch): Promise<SearchResponse>;
export declare function parseSearchResults(html: string, kind: SearchQuery['kind']): SearchResult[];
