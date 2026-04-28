import type { SearchQuery, SearchResponse } from './contracts.js';
import { HeroldError, searchHerold } from './herold.js';

const VERSION = '0.1.0';

interface CliOptions {
  version?: boolean;
  query?: SearchQuery;
}

export async function run(argv: string[], io = { stdout: process.stdout, stderr: process.stderr }): Promise<number> {
  try {
    const options = parseArgs(argv);
    if (options.version) {
      io.stdout.write(`${VERSION}\n`);
      return 0;
    }
    if (!options.query) {
      io.stdout.write(helpText());
      return 0;
    }
    const response = await searchHerold(options.query);
    renderResponse(response, io.stdout);
    return 0;
  } catch (error) {
    if (error instanceof HeroldError) {
      io.stderr.write(`Fehler: ${error.message}\n`);
      return error.exitCode;
    }
    io.stderr.write(`Unerwarteter Fehler: ${error instanceof Error ? error.message : String(error)}\n`);
    return 1;
  }
}

export function parseArgs(argv: string[]): CliOptions {
  if (argv.includes('--version')) {
    return { version: true };
  }
  if (argv.length === 0 || argv.includes('--help') || argv.includes('-h')) return {};

  const [command, subcommand, ...rest] = argv;
  if (command !== 'search') throw new HeroldError(`Unbekannter Befehl: ${command}`, 2);
  const kind = normalizeKind(subcommand);
  if (!kind) throw new HeroldError('Erwartet: herold search firms|people ...', 2);

  const flags = readFlags(rest);
  const term = kind === 'firms' ? (flags.what ?? flags.name) : flags.name;
  if (!term) throw new HeroldError(kind === 'firms' ? 'Firmensuche braucht --what <branche|firma> oder --name <firma>.' : 'Personensuche braucht --name <name>.', 2);

  const query: SearchQuery = {
    kind,
    term,
    page: flags.page ? positiveInt(flags.page, '--page') : 1,
  };
  if (kind === 'firms') query.mode = flags.name ? 'name' : 'what';
  if (flags.where) query.where = flags.where;
  if (flags.limit) query.limit = positiveInt(flags.limit, '--limit');

  return { query };
}

function normalizeKind(value: string | undefined): SearchQuery['kind'] | null {
  if (value === 'firms' || value === 'firm' || value === 'firma' || value === 'firmen') return 'firms';
  if (value === 'people' || value === 'person' || value === 'personen') return 'people';
  return null;
}

function readFlags(args: string[]): Record<string, string> {
  const flags: Record<string, string> = {};
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (!arg) continue;
    if (arg === '--json') {
      continue;
    }
    if (!arg.startsWith('--')) throw new HeroldError(`Unerwartetes Argument: ${arg}`, 2);
    const name = arg.slice(2);
    const value = args[index + 1];
    if (!value || value.startsWith('--')) throw new HeroldError(`Flag --${name} braucht einen Wert.`, 2);
    flags[name] = value;
    index += 1;
  }
  return flags;
}

function positiveInt(value: string, flag: string): number {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isInteger(parsed) || parsed < 1) throw new HeroldError(`${flag} muss eine positive Ganzzahl sein.`, 2);
  return parsed;
}

function renderResponse(response: SearchResponse, stdout: NodeJS.WritableStream): void {
  stdout.write(`${JSON.stringify(response, null, 2)}\n`);
}

function helpText(): string {
  return `herold — Herold.at Firmensuche und Personensuche\n\nUSAGE\n  herold search firms --what <firma|branche> --where <ort> [--page 2] [--limit 10]\n  herold search firms --name <firma> --where <ort> [--page 2] [--limit 10]\n  herold search people --name <name> [--where <ort>] [--page 2] [--limit 10]\n\nAUSGABE\n  Suchbefehle geben immer JSON auf stdout aus. --json ist optional und bleibt als kompatibler No-op erlaubt.\n\nBEISPIELE\n  herold search firms --what friseur --where wien --limit 5\n  herold search firms --name billa --where wien\n  herold search firms --name "KKR Besitz" --where wien\n  herold search people --name schmidt --where wien\n\nGLOBAL\n  -h, --help     Hilfe anzeigen\n  --version      Version anzeigen\n`;
}
