import { describe, expect, it } from 'vitest';
import { parseArgs } from '../src/cli.js';

describe('parseArgs', () => {
  it('parses firm aliases and flags', () => {
    expect(parseArgs(['search', 'firma', '--what', 'friseur', '--where', 'wien', '--limit', '5', '--json'])).toMatchObject({
      query: { kind: 'firms', term: 'friseur', where: 'wien', limit: 5, page: 1 },
    });
    expect(parseArgs(['search', 'firms', '--name', 'billa', '--where', 'wien'])).toMatchObject({
      query: { kind: 'firms', term: 'billa', where: 'wien', page: 1, mode: 'name' },
    });
  });

  it('parses person aliases and page', () => {
    expect(parseArgs(['search', 'person', '--name', 'schmidt', '--page', '2'])).toMatchObject({
      query: { kind: 'people', term: 'schmidt', page: 2 },
    });
  });
});
