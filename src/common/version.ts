import { readFileSync } from 'fs';
import { join } from 'path';

// Versión de la app, leída de package.json en runtime (única fuente de verdad).
// En dev el cwd es la raíz de backend-c; en Docker el WORKDIR es /app y el
// package.json se copia ahí, por lo que process.cwd() lo resuelve en ambos casos.
let cached: string | null = null;

export function getAppVersion(): string {
  if (cached) return cached;
  try {
    const pkg = JSON.parse(
      readFileSync(join(process.cwd(), 'package.json'), 'utf8'),
    ) as { version?: string };
    cached = pkg.version || '0.0.1';
  } catch {
    // Si no se puede leer el archivo (empaquetados atípicos), caemos al valor base.
    cached = '0.0.1';
  }
  return cached;
}
