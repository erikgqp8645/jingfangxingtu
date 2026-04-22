import path from 'node:path';
import {fileURLToPath} from 'node:url';

const moduleDir = path.dirname(fileURLToPath(import.meta.url));
const fallbackAppRoot = path.resolve(moduleDir, '..');

export function resolveAppRoot() {
  const configuredRoot = process.env.JINGFANG_APP_ROOT?.trim();
  return configuredRoot ? path.resolve(configuredRoot) : fallbackAppRoot;
}

export function resolveFromAppRoot(...segments) {
  return path.join(resolveAppRoot(), ...segments);
}

export const appRoot = resolveAppRoot();
