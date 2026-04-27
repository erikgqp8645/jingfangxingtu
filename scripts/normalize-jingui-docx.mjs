import {mkdir, readdir, readFile, writeFile} from 'node:fs/promises';
import path from 'node:path';
import mammoth from 'mammoth';

const rootDir = process.cwd();
const downloadsDir = path.join(process.env.USERPROFILE || 'C:\\Users\\hxst01', 'Downloads');
const outputDir = path.join(rootDir, 'external', 'normalized');
const outputFile = path.join(outputDir, 'jingui-jiaoban-normalized.txt');
const requestedSourcePath = process.argv[2];

const PIANMING_TAG = '<\u7bc7\u540d>';
const MULU_TAG = '<\u76ee\u5f55>';
const SHUXING_LABEL = '\u5c5e\u6027\uff1a';
const PREFERRED_BASENAME = '金匮要略精校版';

function cleanParagraph(value) {
  return value
    .replace(/\r/g, '')
    .replace(/[\u0000\u200B-\u200D\uFEFF]/g, '')
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
  return /^\u7b2c[\u4e00\u4e8c\u4e09\u56db\u4e94\u516d\u4e03\u516b\u4e5d\u5341\u767e\u96f6\u3007]+\u8bb2/.test(value);
}

function isSubHeading(value) {
  return /^[\u25ce\u25cf\u2022]\s*/.test(value);
}

async function resolveSourceDocx() {
  if (requestedSourcePath) {
    const explicitPath = path.resolve(requestedSourcePath);
    await readFile(explicitPath);
    return explicitPath;
  }

  const entries = await readdir(downloadsDir, {withFileTypes: true});
  const docxFiles = entries
    .filter(entry => entry.isFile() && entry.name.toLowerCase().endsWith('.docx'))
    .map(entry => path.join(downloadsDir, entry.name))
    .sort();

  if (docxFiles.length === 0) {
    throw new Error(`No docx file was found in ${downloadsDir}`);
  }

  const preferredFile = docxFiles.find(file => path.parse(file).name === PREFERRED_BASENAME);
  if (preferredFile) {
    return preferredFile;
  }

  return docxFiles[0];
}

function buildNormalizedText(paragraphs) {
  const title = paragraphs[0] || '';
  const lines = [`${PIANMING_TAG}${title}`, ''];
  let sectionCount = 0;
  let lectureCount = 0;
  let subHeadingCount = 0;
  let bodyCount = 0;
  let hasOpenLecture = false;

  for (let index = 1; index < paragraphs.length; index += 1) {
    const paragraph = paragraphs[index];

    if (isSectionHeading(paragraph)) {
      if (hasOpenLecture) {
        lines.push('');
      }
      lines.push(`${MULU_TAG}${paragraph}`);
      lines.push('');
      sectionCount += 1;
      hasOpenLecture = false;
      continue;
    }

    if (isLectureHeading(paragraph)) {
      lines.push(`${PIANMING_TAG}${paragraph}`);
      lines.push(SHUXING_LABEL);
      lines.push('');
      lectureCount += 1;
      hasOpenLecture = true;
      continue;
    }

    if (isSubHeading(paragraph)) {
      lines.push(paragraph);
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
