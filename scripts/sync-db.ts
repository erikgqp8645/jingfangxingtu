import {spawnSync} from 'node:child_process';
import {mkdirSync, writeFileSync} from 'node:fs';
import path from 'node:path';
import {storageDir} from './db.ts';

type Step = {
  label: string;
  script: string;
};

const steps: Step[] = [
  {label: '初始化数据库结构', script: 'db:init'},
  {label: '同步《伤寒论》', script: 'db:import:shanghan'},
  {label: '同步《金匮要略》', script: 'db:import:jingui'},
  {label: '同步《温病条辨》', script: 'db:import:wenbing'},
  {label: '同步关联解析', script: 'db:import:relations'},
];

const syncStatusFile = path.join(storageDir, 'sync-status.json');

function npmCommand() {
  return process.platform === 'win32' ? 'npm.cmd' : 'npm';
}

function runStep(step: Step) {
  console.log(`\n[开始] ${step.label}`);

  const command = process.platform === 'win32' ? (process.env.ComSpec || 'cmd.exe') : npmCommand();
  const args =
    process.platform === 'win32'
      ? ['/d', '/s', '/c', `npm run ${step.script}`]
      : ['run', step.script];

  const result = spawnSync(command, args, {
    cwd: process.cwd(),
    env: process.env,
    stdio: 'inherit',
    shell: false,
  });

  if (result.status !== 0) {
    const reason = result.error?.message || `退出码 ${result.status ?? 'unknown'}`;
    throw new Error(`${step.label}失败，请先处理上面的报错。${reason}`);
  }

  console.log(`[完成] ${step.label}`);
}

function writeSyncStatus() {
  mkdirSync(storageDir, {recursive: true});
  const payload = {
    lastSyncAt: new Date().toISOString(),
    stepCount: steps.length,
    steps: steps.map(step => ({
      label: step.label,
      script: step.script,
    })),
  };
  writeFileSync(syncStatusFile, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
}

function main() {
  console.log('开始执行 SQLite 一键同步...');

  for (const step of steps) {
    runStep(step);
  }

  writeSyncStatus();

  console.log('\n全部同步完成。现在 JSON 与 SQLite 已重新对齐。');
}

main();
