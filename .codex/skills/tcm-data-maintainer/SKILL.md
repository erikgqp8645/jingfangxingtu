---
name: tcm-data-maintainer
description: Maintain and expand the TCM relation-graph dataset for this repository. Use when Codex or other agents need to add or revise clause keywords, fill relation-source JSON entries, run data audits, sync JSON changes into SQLite, or follow the repository's step-by-step data maintenance workflow for files under data/, docs/, storage/, and scripts/.
---

# Tcm Data Maintainer

Maintain this repository's data layer without changing the existing product logic.

## Quick Start

1. Classify the task as one of four modes:
   clause-keyword batch, relation-json supplement, end-to-end maintenance, or audit-first triage.
2. Read [references/input-template.md](./references/input-template.md) to normalize the task input.
3. Read [references/keyword-rules.md](./references/keyword-rules.md) before editing clause keywords.
4. Read [references/batch-strategy.md](./references/batch-strategy.md) before choosing batch size or work order.
5. Make the smallest reliable batch that can be validated.
6. Run the correct commands from [references/commands.md](./references/commands.md).
7. Return results using [references/output-template.md](./references/output-template.md).

## Task Modes

### Clause-Keyword Batch

- Edit `data/经典/**/*.json`.
- Change only the `keywords` field unless a clear data correction is required.
- Keep the batch small enough to finish with audit and sync.

### Relation-JSON Supplement

- Edit `data/关联解析/*.json`.
- Prefer adding JSON entries instead of depending on TXT fallback.
- Read TXT only as source material when JSON is missing or too thin.

### End-to-End Maintenance

- Read clause files first.
- Add or refine keywords.
- Run the audit.
- If some valuable keywords still have no relation hit, supplement relation JSON.
- Re-run the audit.
- Sync SQLite.

### Audit-First Triage

- Run `npm run data:audit`.
- Read `docs/当前数据体检报告.md`.
- Read `docs/首批优先补充清单.md`.
- Choose one high-value small batch and finish it.

## Standard Procedure

### 1. Read before editing

- For clause work:
  Read each target clause JSON file first.
- For relation work:
  Read the target relation JSON first.
  Read the TXT file only when JSON is missing, incomplete, or needs supporting material.
- For audit-driven work:
  Read the latest generated reports before deciding scope.

### 2. Edit conservatively

- Prefer small, reliable batches over large speculative batches.
- Keep clause keywords concise and graph-friendly.
- Prefer JSON-first relation maintenance.
- Keep TXT as source material or fallback, not the preferred precise structure.
- Do not change original clause text unless the task explicitly requires a correction.
- Do not rewrite frontend or backend logic unless the task explicitly includes code work.

### 3. Validate

- After any data edit, run `npm run data:audit`.
- If JSON changed and the app should immediately reflect it, run `npm run db:sync`.
- If only relation JSON changed and the task is narrow, `npm run db:import:relations` is acceptable.

### 4. Report clearly

- Say what changed.
- Say which side changed: clause-side, relation-side, or both.
- Say what improved in the audit.
- Say whether SQLite was re-synced.

## Guardrails

- Do not remove user-authored data unless the task clearly asks for deletion or correction.
- Prefer editing existing files over creating new formats.
- When a keyword has no relation hit, first decide whether the keyword is too specific or whether the relation JSON is missing an entry.
- Prefer one finished batch over several incomplete batches.

## Key Commands

Use [references/commands.md](./references/commands.md) for the exact command set and when to run each command.

## Input Template

Use [references/input-template.md](./references/input-template.md) before starting work.

## Prompt Templates

Use [references/prompts.md](./references/prompts.md) when handing this work to another agent.
Pick the closest template, replace placeholders, and keep the batch small enough to finish with audit and sync.

## Real Task Example

Use [references/real-task-example.md](./references/real-task-example.md) when you need a concrete prompt that can be sent to another agent immediately.

## Batch Strategy

Use [references/batch-strategy.md](./references/batch-strategy.md) to choose work order, batch size, and when to switch from keyword work to relation work.

## Output Standard

Use [references/output-template.md](./references/output-template.md).

## Key Files

- `data/jingdianconfig.json`
- `data/guanlianjiexiconfig.json`
- `data/经典/**/*.json`
- `data/关联解析/*.json`
- `data/关联解析/*.txt`
- `data/keyword-blacklist.json`
- `docs/当前数据体检报告.md`
- `docs/首批优先补充清单.md`

## Expansion Rule

- Prefer finishing one small batch end to end:
  add keywords -> audit -> relation fix if needed -> sync DB.
- For `伤寒论`, prioritize early core clauses first.
- If relation hits lag behind keyword work, switch to relation JSON supplementation before adding more keyword batches.
