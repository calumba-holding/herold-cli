export type SearchKind = 'firms' | 'people';
export interface SearchQuery {
    kind: SearchKind;
    term: string;
    where?: string;
    page: number;
    limit?: number;
    mode?: 'name' | 'what';
}
export interface Contact {
    type: string;
    value: string;
}
export interface FirmResult {
    kind: 'firm';
    id: string | null;
    name: string;
    industry: string | null;
    url: string | null;
    address: string | null;
    postalCode: string | null;
    city: string | null;
    countryCode: string | null;
    phone: string | null;
    contacts: Contact[];
    rating: {
        average: number | null;
        count: number | null;
    };
    verified: boolean;
    raw: unknown;
}
export interface PersonResult {
    kind: 'person';
    id: string | null;
    name: string;
    firstName: string | null;
    lastName: string | null;
    category: string | null;
    url: string | null;
    address: string | null;
    postalCode: string | null;
    city: string | null;
    phone: string | null;
    contacts: Contact[];
    raw: unknown;
}
export type SearchResult = FirmResult | PersonResult;
export interface SearchResponse {
    query: SearchQuery;
    sourceUrl: string;
    fetchedAt: string;
    results: SearchResult[];
}
