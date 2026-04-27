import {mkdir, readdir, readFile, writeFile} from 'node:fs/promises';
import path from 'node:path';
import mammoth from 'mammoth';

const rootDir = process.cwd();
const downloadsDir = path.join(process.env.USERPROFILE || 'C:\\Users\\hxst01', 'Downloads');
const outputDir = path.join(rootDir, 'external', 'normalized');
const outputFile = path.join(outputDir, 'jingui-jiaoban-normalized.txt');

function cleanParagraph(value) {
  return value
    .replace(/\r/g, '')
    .replace(/[\u0000\u200B-\u200D\uFEFF]/g, '')
    .replace(/[ \t]+/g, ' ')
    .replace(/ +([，。；：！？）》」』、])/g, '$1')
    .replace(/([《「『（]) +/g, '$1')
    .trim();
}

function splitParagraphs(raw) {
  return raw
    .split(/\n\s*\n/)
    .map(cleanParagraph)
    .filter(Boolean);
}

function isSectionHeading(value) {
  return /^\d{3}.+/.test(value);
}

function isLectureHeading(value) {
  return /^第[一二三四五六七八九十百零〇]+讲/.test(value);
}

function isSubHeading(value) {
  return /^[◎●•]\s*/.test(value);
}

async function resolveSourceDocx() {
  const entries = await readdir(downloadsDir, {withFileTypes: true});
  const candidates = entries
    .filter(entry => entry.isFile() && entry.name.endsWith('.docx') && entry.name.includes('金匮要略'))
    .map(entry => path.join(downloadsDir, entry.name))
    .sort();

  if (candidates.length === 0) {
    throw new Error(`No docx file containing 金匮要略 was found in ${downloadsDir}`);
  }

  return candidates[0];
}

function buildNormalizedText(paragraphs) {
  const title = paragraphs[0] || '金匮要略精校版';
  const lines = [`[TITLE] ${title}`, ''];
  let sectionCount = 0;
  let lectureCount = 0;
  let subHeadingCount = 0;
  let bodyCount = 0;

  for (let index = 1; index < paragraphs.length; index += 1) {
    const paragraph = paragraphs[index];

    if (isSectionHeading(paragraph)) {
      lines.push(`[SECTION] ${paragraph}`);
      lines.push('');
      sectionCount += 1;
      continue;
    }

    if (isLectureHeading(paragraph)) {
      lines.push(`[LECTURE] ${paragraph}`);
      lines.push('');
      lectureCount += 1;
      continue;
    }

    if (isSubHeading(paragraph)) {
      lines.push(`[SUBHEADING] ${paragraph.replace(/^[◎●•]\s*/, '')}`);
      lines.push('');
      subHeadingCount += 1;
      continue;
    }

    lines.push(paragraph);
    lines.push('');
    bodyCount += 1;
  }

  return {
    text: `${lines.join('\n').replace(/\n{3,}/g, '\n\n').trim()}\n`,
    stats: {
      sectionCount,
      lectureCount,
      subHeadingCount,
      bodyCount,
      totalParagraphs: paragraphs.length,
    },
  };
}

async function main() {
  const sourceFile = await resolveSourceDocx();
  const buffer = await readFile(sourceFile);
  const result = await mammoth.extractRawText({buffer});
  const paragraphs = splitParagraphs(result.value);
  const {text, stats} = buildNormalizedText(paragraphs);

  await mkdir(outputDir, {recursive: true});
  await writeFile(outputFile, text, 'utf8');

  console.log(`source: ${sourceFile}`);
  console.log(`output: ${outputFile}`);
  console.log(`paragraphs: ${stats.totalParagraphs}`);
  console.log(`sections: ${stats.sectionCount}`);
  console.log(`lectures: ${stats.lectureCount}`);
  console.log(`subHeadings: ${stats.subHeadingCount}`);
  console.log(`bodyParagraphs: ${stats.bodyCount}`);
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
