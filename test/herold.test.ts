import { describe, expect, it } from 'vitest';
import { buildSearchUrl, parseSearchResults } from '../src/herold.js';

function qwikHtml(objs: unknown[]): string {
  return `<html><script type="qwik/json">${JSON.stringify({ objs })}</script></html>`;
}

describe('buildSearchUrl', () => {
  it('builds firm search URLs', () => {
    expect(buildSearchUrl({ kind: 'firms', term: 'Friseur', where: 'Wien', page: 1, mode: 'what' })).toBe('https://www.herold.at/gelbe-seiten/wien/friseur/');
    expect(buildSearchUrl({ kind: 'firms', term: 'Installateur', where: 'Graz Umgebung', page: 3, mode: 'what' })).toBe('https://www.herold.at/gelbe-seiten/graz-umgebung/installateur/seite/3/');
    expect(buildSearchUrl({ kind: 'firms', term: 'KKR Besitz', where: 'Wien', page: 1, mode: 'name' })).toBe('https://www.herold.at/gelbe-seiten/suche/?term=KKR+Besitz&geo=Wien');
  });

  it('builds people search URLs', () => {
    expect(buildSearchUrl({ kind: 'people', term: 'Schmidt', where: 'Wien', page: 1 })).toBe('https://www.herold.at/telefonbuch/wien/schmidt/');
    expect(buildSearchUrl({ kind: 'people', term: 'Schmidt', page: 2 })).toBe('https://www.herold.at/telefonbuch/schmidt/seite/2/');
  });
});

describe('parseSearchResults', () => {
  it('parses firm results from Qwik JSON', () => {
    const objs: unknown[] = [];
    objs[0] = { cryptedSid: '1', industry: '2', address: '5', contacts: 'a', name: 'h', slug: 'i', rating: 'j', verified: 'm' };
    objs[1] = 'sid123';
    objs[2] = { name: '3' };
    objs[3] = 'Friseur';
    objs[5] = { street: '6', zip: '7', city: '8', countryCode: 'n' };
    objs[6] = 'Stephansplatz 1';
    objs[7] = { name: 'b' };
    objs[8] = { name: 'c' };
    objs[10] = ['d'];
    objs[11] = '1010';
    objs[12] = 'Wien';
    objs[13] = { type: 'e', number: 'f' };
    objs[14] = 'phone';
    objs[15] = '43 1 234';
    objs[17] = 'Ossig Hairstyle';
    objs[18] = 'ossig-hairstyle';
    objs[19] = { average: 'k', count: 'l' };
    objs[20] = 4.7;
    objs[21] = 43;
    objs[22] = true;
    objs[23] = 'AT';

    const results = parseSearchResults(qwikHtml(objs), 'firms');
    expect(results).toHaveLength(1);
    expect(results[0]).toMatchObject({ kind: 'firm', name: 'Ossig Hairstyle', industry: 'Friseur', phone: '43 1 234', city: 'Wien' });
  });

  it('parses person results from Qwik JSON', () => {
    const objs: unknown[] = [];
    objs[0] = { pid: '1', cryptedPid: '2', displayName: '3', mainNumber: '4', contacts: '8', firstName: 'a', name: 'b', address: 'c', zip: 'd', city: 'e', slug: 'f', category: 'g' };
    objs[1] = 'pid';
    objs[2] = 'crypt';
    objs[3] = 'Schmidt Max';
    objs[4] = { type: '5', number: '6' };
    objs[5] = 'phone';
    objs[6] = '43 664 123';
    objs[8] = [];
    objs[10] = 'Max';
    objs[11] = 'Schmidt';
    objs[12] = 'Ring 1, 1010 Wien';
    objs[13] = { name: 'h' };
    objs[14] = { name: 'i' };
    objs[15] = 'max_schmidt';
    objs[16] = null;
    objs[17] = '1010';
    objs[18] = 'Wien';

    const results = parseSearchResults(qwikHtml(objs), 'people');
    expect(results).toHaveLength(1);
    expect(results[0]).toMatchObject({ kind: 'person', name: 'Schmidt Max', firstName: 'Max', lastName: 'Schmidt', phone: '43 664 123' });
  });
});
