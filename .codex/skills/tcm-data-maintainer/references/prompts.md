# Prompt Templates

Use these prompts as starting points for other agents.

Replace the placeholders before use.

## 1. Clause Keyword Batch

```text
Use $tcm-data-maintainer in this repository.

Task:
Add or improve keywords for these clause files:
- <file 1>
- <file 2>
- <file 3>

Rules:
- Do not change original clause text.
- Only edit the `keywords` field unless a clear data correction is required.
- Prefer words that appear directly in the clause text.
- Prefer symptom terms, pulse terms, syndrome terms, formula names, and key body-location terms.
- Avoid generic words from `data/keyword-blacklist.json`.
- Keep each clause to a small, useful set of keywords.

After editing:
- Run `npm run data:audit`
- If the changes are acceptable, run `npm run db:sync`

Report:
- Which files changed
- Audit result summary
- Whether SQLite was synced
```

## 2. Relation JSON Supplement

```text
Use $tcm-data-maintainer in this repository.

Task:
Fix relation coverage for these keywords:
- <keyword 1>
- <keyword 2>
- <keyword 3>

Preferred target:
- `data/关联解析/<file>.json`

Rules:
- Prefer adding JSON entries instead of relying on TXT fallback.
- Keep each entry short, clear, and useful for relation linking.
- Do not rewrite existing frontend or backend logic.

After editing:
- Run `npm run data:audit`
- If relation JSON changed, run `npm run db:import:relations`

Report:
- Which relation file changed
- Which keywords were added
- Whether `keywordsWithoutHit` improved
```

## 3. End-to-End Data Maintenance

```text
Use $tcm-data-maintainer in this repository.

Task:
Maintain a small batch of TCM data end to end.

Scope:
- Clause files: <list>
- Relation source files: <list or auto-decide>

Process:
1. Read the clause files first
2. Add or refine keywords
3. Run `npm run data:audit`
4. If some keywords still have no relation hit, supplement relation JSON
5. Run `npm run data:audit` again
6. Run `npm run db:sync`

Rules:
- Keep edits small and reliable
- Prefer finishing one batch fully instead of starting many incomplete batches
- Preserve existing product logic

Report:
- Clause-side changes
- Relation-side changes
- Audit before/after summary
- DB sync status
```

## 4. Audit-First Triage

```text
Use $tcm-data-maintainer in this repository.

Task:
Run the data audit, identify the most valuable next small batch, and complete it.

Rules:
- Read the generated audit report and priority list
- Prefer the highest-value small batch
- Finish the batch end to end if possible

After work:
- Re-run `npm run data:audit`
- Run `npm run db:sync` if JSON changed

Report:
- Why this batch was chosen
- Which files changed
- Audit metrics before/after
```
