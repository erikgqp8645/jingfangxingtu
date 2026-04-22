import fs from 'node:fs';
import path from 'node:path';

function ensureDir(dir) {
  fs.mkdirSync(dir, {recursive: true});
}

function copyDirIfMissing(sourceDir, targetDir) {
  if (!fs.existsSync(sourceDir) || fs.existsSync(targetDir)) {
    return;
  }

  ensureDir(path.dirname(targetDir));
  fs.cpSync(sourceDir, targetDir, {recursive: true});
}

function copyFileIfMissing(sourceFile, targetFile) {
  if (!fs.existsSync(sourceFile) || fs.existsSync(targetFile)) {
    return;
  }

  ensureDir(path.dirname(targetFile));
  fs.copyFileSync(sourceFile, targetFile);
}

export function ensureWritableAppRoot({app, isDev, appRoot}) {
  if (isDev) {
    process.env.JINGFANG_APP_ROOT = appRoot;
    return appRoot;
  }

  const writableRoot = path.join(app.getPath('userData'), 'workspace');
  const bundledRoot = path.join(process.resourcesPath, 'bundled');
  const bundledDataDir = path.join(bundledRoot, 'data');
  const bundledDbFile = path.join(bundledRoot, 'storage', 'app.db');

  ensureDir(writableRoot);
  copyDirIfMissing(bundledDataDir, path.join(writableRoot, 'data'));
  copyFileIfMissing(bundledDbFile, path.join(writableRoot, 'storage', 'app.db'));

  process.env.JINGFANG_APP_ROOT = writableRoot;
  return writableRoot;
}
