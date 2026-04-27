import {readFile} from 'node:fs/promises';
import path from 'node:path';

const rootDir = process.cwd();
const targetFile = path.join(rootDir, 'external', 'normalized', 'jingui-jiaoban-normalized.txt');

const PIANMING_TAG = '<\u7bc7\u540d>';
const MULU_TAG = '<\u76ee\u5f55>';
const SHUXING_LABEL = '\u5c5e\u6027\uff1a';

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

async function main() {
  const raw = await readFile(targetFile, 'utf8');
  const lines = raw.split(/\r?\n/);
  const titleMatches = raw.match(new RegExp(`^${escapeRegExp(PIANMING_TAG)}.+`, 'gm')) || [];
  const sectionMatches = raw.match(new RegExp(`^${escapeRegExp(MULU_TAG)}.+`, 'gm')) || [];
  const propertyMatches = raw.match(new RegExp(`^${escapeRegExp(SHUXING_LABEL)}$`, 'gm')) || [];
  const bodyLines = lines
    .map(line => line.trim())
    .filter(Boolean)
    .filter(line => !line.startsWith(PIANMING_TAG))
    .filter(line => !line.startsWith(MULU_TAG))
    .filter(line => line !== SHUXING_LABEL);

  if (!raw.startsWith(PIANMING_TAG)) {
    throw new Error(`Validation failed: file must start with ${PIANMING_TAG}`);
  }

  if (sectionMatches.length === 0) {
    throw new Error(`Validation failed: no ${MULU_TAG} headings found`);
  }

  if (titleMatches.length < 2) {
    throw new Error(`Validation failed: expected top title plus at least one additional ${PIANMING_TAG} heading`);
  }

  if (propertyMatches.length === 0) {
    throw new Error(`Validation failed: no ${SHUXING_LABEL} separator found`);
  }

  if (bodyLines.length === 0) {
    throw new Error('Validation failed: no body content found');
  }

  console.log(`validated file: ${targetFile}`);
  console.log(`pianmingLines: ${titleMatches.length}`);
  console.log(`catalogLines: ${sectionMatches.length}`);
  console.log(`propertyLines: ${propertyMatches.length}`);
  console.log(`bodyLines: ${bodyLines.length}`);
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
