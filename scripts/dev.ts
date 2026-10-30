import { spawn, type ChildProcess } from 'node:child_process';
import type { Readable } from 'node:stream';

/**
 * Lance hub, tableau de bord et simulateur dans un seul terminal : `npm run dev`.
 * Les options placées après `--` sont transmises au simulateur : `npm run dev -- --chaos`.
 * Le simulateur ne démarre qu'une fois le hub à l'écoute, pour ne perdre aucune trame au lancement.
 */
const simulatorArgs = process.argv.slice(2);
const children: ChildProcess[] = [];
let shuttingDown = false;

function run(name: string, color: number, script: string, args: string[] = [], onLine?: (line: string) => void): void {
  const child = spawn('npm', ['run', '--silent', script, ...(args.length > 0 ? ['--', ...args] : [])], {
    stdio: ['ignore', 'pipe', 'pipe'],
    shell: process.platform === 'win32',
  });
  const prefix = `\x1b[${color}m[${name}]\x1b[0m `;

  const forward = (stream: Readable) => {
    let pending = '';
    stream.setEncoding('utf8');
    stream.on('data', (chunk: string) => {
      const lines = (pending + chunk).split(/\r?\n|\r/);
      pending = lines.pop() ?? '';
      for (const line of lines) {
        if (line.trim() === '') continue;
        process.stdout.write(prefix + line + '\n');
        onLine?.(line);
      }
    });
  };
  forward(child.stdout!);
  forward(child.stderr!);

  child.on('exit', (code) => {
    if (shuttingDown) return;
    if (code === 0) {
      // fin normale (ex. simulateur lancé avec --duration) : le hub et le tableau de bord continuent
      process.stdout.write(`${prefix}terminé\n`);
      return;
    }
    process.stdout.write(`${prefix}arrêté (code ${code ?? 'signal'}), arrêt des autres processus\n`);
    shutdown(code ?? 1);
  });
  children.push(child);
}

function shutdown(exitCode = 0): void {
  if (shuttingDown) return;
  shuttingDown = true;
  children.forEach((child) => child.kill('SIGTERM'));
  setTimeout(() => process.exit(exitCode), 500);
}

let simulatorStarted = false;
run('hub', 36, 'hub', [], (line) => {
  if (!simulatorStarted && line.includes('réception UDP')) {
    simulatorStarted = true;
    run('sim', 35, 'sim', ['--quiet', ...simulatorArgs]);
  }
});
run('dashboard', 32, 'dashboard', ['--open']);

process.once('SIGINT', () => shutdown());
process.once('SIGTERM', () => shutdown());
