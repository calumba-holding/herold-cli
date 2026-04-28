import type { Contact, FirmResult, PersonResult, SearchQuery, SearchResponse, SearchResult } from './contracts.js';

const BASE_URL = 'https://www.herold.at';

interface QwikData {
  objs: unknown[];
}

export class HeroldError extends Error {
  constructor(message: string, readonly exitCode = 1) {
    super(message);
    this.name = 'HeroldError';
  }
}

export function buildSearchUrl(query: SearchQuery): string {
  const pagePart = query.page > 1 ? `seite/${query.page}/` : '';
  if (query.kind === 'firms') {
    if (!query.where) throw new HeroldError('Firmensuche braucht --where <ort>.', 2);
    if (query.mode === 'name') {
      const params = new URLSearchParams({ term: query.term, geo: query.where });
      return `${BASE_URL}/gelbe-seiten/suche/?${params.toString()}`;
    }
    return `${BASE_URL}/gelbe-seiten/${slugify(query.where)}/${slugify(query.term)}/${pagePart}`;
  }
  if (query.where) {
    return `${BASE_URL}/telefonbuch/${slugify(query.where)}/${slugify(query.term)}/${pagePart}`;
  }
  return `${BASE_URL}/telefonbuch/${slugify(query.term)}/${pagePart}`;
}

export async function searchHerold(query: SearchQuery, fetchImpl: typeof fetch = fetch): Promise<SearchResponse> {
  const sourceUrl = buildSearchUrl(query);

  if (query.kind === 'firms' && query.mode === 'name') {
    const results = await searchFirmByName(query, fetchImpl);
    return {
      query,
      sourceUrl,
      fetchedAt: new Date().toISOString(),
      results: typeof query.limit === 'number' ? results.slice(0, query.limit) : results,
    };
  }

  const response = await fetchImpl(sourceUrl, {
    headers: {
      'accept': 'text/html,application/xhtml+xml',
      'user-agent': 'herold-cli/0.1 (+https://github.com/calumba-holding/herold-cli)',
    },
  });
  if (!response.ok && response.status !== 404) {
    throw new HeroldError(`Herold.at antwortete mit HTTP ${response.status}.`, 3);
  }
  const html = await response.text();
  const results = parseSearchResults(html, query.kind);

  return {
    query,
    sourceUrl,
    fetchedAt: new Date().toISOString(),
    results: typeof query.limit === 'number' ? results.slice(0, query.limit) : results,
  };
}

export function parseSearchResults(html: string, kind: SearchQuery['kind']): SearchResult[] {
  const data = extractQwikData(html);
  if (!data) return [];
  return kind === 'firms' ? parseFirmResults(data) : parsePersonResults(data);
}

async function searchFirmByName(query: SearchQuery, fetchImpl: typeof fetch): Promise<FirmResult[]> {
  const suggestions = await fetchFirmNameSuggestions(query.term, fetchImpl);
  const filtered = suggestions.filter((suggestion) => matchesWhere(suggestion.extraOptions, query.where));
  const results: FirmResult[] = [];
  const seen = new Set<string>();

  for (const suggestion of filtered.slice(0, 8)) {
    const url = buildFirmDetailUrl(suggestion.extraOptions);
    if (!url) continue;
    const response = await fetchImpl(url, {
      headers: {
        accept: 'text/html,application/xhtml+xml',
        'user-agent': 'herold-cli/0.1 (+https://github.com/calumba-holding/herold-cli)',
      },
    });
    if (!response.ok) continue;
    const parsed = parseSearchResults(await response.text(), 'firms') as FirmResult[];
    for (const result of parsed) {
      const key = result.id ?? `${result.name}|${result.address ?? ''}`;
      if (seen.has(key)) continue;
      seen.add(key);
      results.push(result);
    }
  }

  return rankFirmResults(results, query.where);
}

interface FirmSuggestion {
  id: string;
  value: string;
  extraOptions: Record<string, unknown>;
}

async function fetchFirmNameSuggestions(term: string, fetchImpl: typeof fetch): Promise<FirmSuggestion[]> {
  const symbol = 'RGMQDFItNec';
  const payload = JSON.stringify({
    _entry: '2',
    _objs: [`\u0002_#s_${symbol}`, term, ['0', '1']],
  });
  const response = await fetchImpl(`${BASE_URL}/gelbe-seiten/?qfunc=${symbol}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/qwik-json',
      Accept: 'application/json, application/qwik-json, text/qwik-json-stream, text/plain',
      'X-QRL': symbol,
    },
    body: payload,
  });
  if (!response.ok) return [];
  const data = JSON.parse(await response.text()) as { _entry: string; _objs: unknown[] };
  const entryIndex = Number.parseInt(data._entry, 36);
  if (!Number.isInteger(entryIndex) || entryIndex < 0 || entryIndex >= data._objs.length) return [];
  const resolved = resolveQwikValue(data._objs, data._objs[entryIndex]);
  if (!Array.isArray(resolved)) return [];

  return resolved
    .flatMap((group) => {
      if (!isRecord(group) || !Array.isArray(group.options)) return [];
      return group.options;
    })
    .filter((option): option is FirmSuggestion => isRecord(option) && typeof option.id === 'string' && typeof option.value === 'string' && isRecord(option.extraOptions));
}

function resolveQwikValue(objs: unknown[], value: unknown, seen = new Set<number>()): unknown {
  if (typeof value === 'string') {
    if (value.startsWith('\u0002') || value.startsWith('\u0001')) return value;
    if (/^[0-9a-z]+$/.test(value)) {
      const index = Number.parseInt(value, 36);
      if (Number.isInteger(index) && index >= 0 && index < objs.length && !seen.has(index)) {
        seen.add(index);
        return resolveQwikValue(objs, objs[index], seen);
      }
    }
    return value;
  }
  if (Array.isArray(value)) return value.map((item) => resolveQwikValue(objs, item, new Set(seen)));
  if (isRecord(value)) {
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, resolveQwikValue(objs, item, new Set(seen))]));
  }
  return value;
}

function buildFirmDetailUrl(extraOptions: Record<string, unknown>): string | null {
  const cryptedSid = stringValue(extraOptions.cryptedSid);
  const slug = stringValue(extraOptions.slug);
  const address = objectValue(extraOptions.address);
  const city = objectValue(address?.city);
  const citySlug = stringValue(city?.slug);
  if (!cryptedSid || !slug || !citySlug) return null;
  const citySegment = citySlug.includes('_') ? citySlug.split('_').at(-1) : citySlug;
  return citySegment ? `${BASE_URL}/gelbe-seiten/${encodeURIComponent(citySegment)}/${encodeURIComponent(cryptedSid)}/${encodeURIComponent(slug)}/` : null;
}

function matchesWhere(extraOptions: Record<string, unknown>, where: string | undefined): boolean {
  if (!where) return true;
  const normalizedWhere = normalizeText(where);
  const address = objectValue(extraOptions.address);
  const city = objectValue(address?.city);
  const state = objectValue(address?.state);
  const district = objectValue(address?.district);
  const zip = objectValue(address?.zip);
  const haystack = [
    stringValue(extraOptions.name),
    stringValue(address?.street),
    stringValue(city?.name),
    stringValue(state?.name),
    stringValue(district?.name),
    stringValue(zip?.name),
  ]
    .filter((value): value is string => Boolean(value))
    .map(normalizeText)
    .join(' ');
  return haystack.includes(normalizedWhere);
}

function rankFirmResults(results: FirmResult[], where: string | undefined): FirmResult[] {
  if (!where) return results;
  const normalizedWhere = normalizeText(where);
  return [...results].sort((left, right) => whereScore(right, normalizedWhere) - whereScore(left, normalizedWhere));
}

function whereScore(result: FirmResult, normalizedWhere: string): number {
  const city = normalizeText(result.city ?? '');
  const address = normalizeText(result.address ?? '');
  if (city === normalizedWhere) return 3;
  if (new RegExp(`\\b${escapeRegExp(normalizedWhere)}\\b`, 'i').test(address)) return 2;
  if (city.includes(normalizedWhere)) return 1;
  return 0;
}

function normalizeText(value: string): string {
  return value.trim().toLowerCase();
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}


function extractQwikData(html: string): QwikData | null {
  const match = html.match(/<script[^>]*type=["']qwik\/json["'][^>]*>([\s\S]*?)<\/script>/);
  if (!match?.[1]) return null;
  try {
    const json = match[1].replace(/\\x3C(\/?script)/gi, '<$1');
    const parsed = JSON.parse(json) as Partial<QwikData>;
    return Array.isArray(parsed.objs) ? { objs: parsed.objs } : null;
  } catch {
    return null;
  }
}

function parseFirmResults(data: QwikData): FirmResult[] {
  const results: FirmResult[] = [];
  const seen = new Set<string>();

  for (const raw of data.objs) {
    if (!isRecord(raw)) continue;
    if (!('cryptedSid' in raw) || !('industry' in raw) || !('address' in raw) || !('contacts' in raw)) continue;

    const id = stringValue(resolveRef(data, raw.cryptedSid));
    const name = stringValue(resolveRef(data, raw.name));
    if (!name || seen.has(id ?? name)) continue;
    seen.add(id ?? name);

    const industry = objectValue(resolveRef(data, raw.industry));
    const address = objectValue(resolveRef(data, raw.address));
    const city = objectValue(resolveRef(data, address?.city));
    const zip = objectValue(resolveRef(data, address?.zip));
    const rating = objectValue(resolveRef(data, raw.rating));
    const contacts = parseContacts(data, resolveRef(data, raw.contacts));
    const slug = stringValue(resolveRef(data, raw.slug));

    results.push({
      kind: 'firm',
      id,
      name,
      industry: stringValue(resolveRef(data, industry?.name)),
      url: slug ? `${BASE_URL}/firmen/${slug}/` : null,
      address: formatAddress([
        stringValue(resolveRef(data, address?.street)),
        stringValue(resolveRef(data, zip?.name)),
        stringValue(resolveRef(data, city?.name)),
      ]),
      postalCode: stringValue(resolveRef(data, zip?.name)),
      city: stringValue(resolveRef(data, city?.name)),
      countryCode: stringValue(resolveRef(data, address?.countryCode)),
      phone: contacts.find((contact) => contact.type.toLowerCase() === 'phone')?.value ?? null,
      contacts,
      rating: {
        average: numberValue(resolveRef(data, rating?.average)),
        count: numberValue(resolveRef(data, rating?.count)),
      },
      verified: booleanValue(resolveRef(data, raw.verified)),
      raw: materialize(data, raw),
    });
  }

  return results;
}

function parsePersonResults(data: QwikData): PersonResult[] {
  const results: PersonResult[] = [];
  const seen = new Set<string>();

  for (const raw of data.objs) {
    if (!isRecord(raw)) continue;
    if (!('pid' in raw) || !('cryptedPid' in raw) || !('displayName' in raw) || !('mainNumber' in raw)) continue;

    const id = stringValue(resolveRef(data, raw.cryptedPid));
    const name = stringValue(resolveRef(data, raw.displayName));
    if (!name || seen.has(id ?? name)) continue;
    seen.add(id ?? name);

    const zip = objectValue(resolveRef(data, raw.zip));
    const city = objectValue(resolveRef(data, raw.city));
    const contacts = parseContacts(data, resolveRef(data, raw.contacts));
    const mainNumber = parseContact(data, resolveRef(data, raw.mainNumber));
    const allContacts = mainNumber ? [mainNumber, ...contacts.filter((c) => c.value !== mainNumber.value)] : contacts;
    const slug = stringValue(resolveRef(data, raw.slug));

    results.push({
      kind: 'person',
      id,
      name,
      firstName: stringValue(resolveRef(data, raw.firstName)),
      lastName: stringValue(resolveRef(data, raw.name)),
      category: stringValue(resolveRef(data, raw.category)),
      url: slug ? `${BASE_URL}/telefonbuch/${slug}/` : null,
      address: stringValue(resolveRef(data, raw.address)),
      postalCode: stringValue(resolveRef(data, zip?.name)),
      city: stringValue(resolveRef(data, city?.name)),
      phone: allContacts.find((contact) => contact.type.toLowerCase() === 'phone')?.value ?? null,
      contacts: allContacts,
      raw: materialize(data, raw),
    });
  }

  return results;
}

function parseContacts(data: QwikData, rawContacts: unknown): Contact[] {
  if (!Array.isArray(rawContacts)) return [];
  return rawContacts.map((contact) => parseContact(data, contact)).filter((contact): contact is Contact => contact !== null);
}

function parseContact(data: QwikData, rawContact: unknown): Contact | null {
  const contact = objectValue(resolveRef(data, rawContact));
  if (!contact) return null;
  const type = stringValue(resolveRef(data, contact.type)) ?? 'contact';
  const value = stringValue(resolveRef(data, contact.number)) ?? stringValue(resolveRef(data, contact.value)) ?? stringValue(resolveRef(data, contact.email)) ?? stringValue(resolveRef(data, contact.url));
  return value ? { type, value } : null;
}

function resolveRef(data: QwikData, value: unknown): unknown {
  if (typeof value !== 'string') return value;
  const key = value.endsWith('!') ? value.slice(0, -1) : value;
  if (!/^[0-9a-z]+$/.test(key)) return value;
  const index = Number.parseInt(key, 36);
  if (!Number.isInteger(index) || index < 0 || index >= data.objs.length) return value;
  return data.objs[index];
}

function materialize(data: QwikData, value: unknown, depth = 0): unknown {
  if (depth > 4) return value;
  const resolved = resolveRef(data, value);
  if (Array.isArray(resolved)) return resolved.map((item) => materialize(data, item, depth + 1));
  if (isRecord(resolved)) {
    return Object.fromEntries(Object.entries(resolved).map(([key, item]) => [key, materialize(data, item, depth + 1)]));
  }
  return resolved;
}

function slugify(value: string): string {
  return encodeURIComponent(value.trim().toLowerCase().replace(/\s+/g, '-'));
}

function formatAddress(parts: Array<string | null>): string | null {
  const [street, zip, city] = parts;
  const locality = [zip, city].filter(Boolean).join(' ');
  return [street, locality].filter(Boolean).join(', ') || null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function objectValue(value: unknown): Record<string, unknown> | null {
  return isRecord(value) ? value : null;
}

function stringValue(value: unknown): string | null {
  return typeof value === 'string' && value.charCodeAt(0) !== 1 && value.charCodeAt(0) !== 18 ? value : null;
}

function numberValue(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function booleanValue(value: unknown): boolean {
  return value === true;
}
