import {readFile} from 'node:fs/promises';
import path from 'node:path';

const rootDir = process.cwd();
const targetFile = path.join(rootDir, 'external', 'normalized', 'jingui-jiaoban-normalized.txt');

async function main() {
  const raw = await readFile(targetFile, 'utf8');
  const lines = raw.split(/\r?\n/);
  const titleMatches = raw.match(/^\[TITLE\] .+/gm) || [];
  const sectionMatches = raw.match(/^\[SECTION\] .+/gm) || [];
  const lectureMatches = raw.match(/^\[LECTURE\] .+/gm) || [];
  const subHeadingMatches = raw.match(/^\[SUBHEADING\] .+/gm) || [];
  const bodyLines = lines
    .map(line => line.trim())
    .filter(Boolean)
    .filter(line => !/^\[(TITLE|SECTION|LECTURE|SUBHEADING)\] /.test(line));

  if (titleMatches.length !== 1) {
    throw new Error(`Validation failed: expected 1 title, got ${titleMatches.length}`);
  }

  if (sectionMatches.length === 0) {
    throw new Error('Validation failed: no section headings found');
  }

  if (lectureMatches.length === 0) {
    throw new Error('Validation failed: no lecture headings found');
  }

  if (bodyLines.length === 0) {
    throw new Error('Validation failed: no body content found');
  }

  console.log(`validated file: ${targetFile}`);
  console.log(`title: ${titleMatches.length}`);
  console.log(`sections: ${sectionMatches.length}`);
  console.log(`lectures: ${lectureMatches.length}`);
  console.log(`subHeadings: ${subHeadingMatches.length}`);
  console.log(`bodyLines: ${bodyLines.length}`);
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
