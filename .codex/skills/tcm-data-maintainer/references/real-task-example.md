# Real Task Example

Use this as a ready-to-send prompt for another agent.

## Example: Continue Shanghan Batch

```text
Use $tcm-data-maintainer in this repository.

Task mode: end-to-end maintenance
Book: 伤寒论
Clause files:
- data/经典/伤寒论/26.json
- data/经典/伤寒论/27.json
- data/经典/伤寒论/28.json
- data/经典/伤寒论/30.json
- data/经典/伤寒论/31.json
- data/经典/伤寒论/32.json

Requirements:
- Read each clause file first.
- Only edit the `keywords` field unless a clear data correction is required.
- Prefer words that appear directly in the clause text.
- Keep each clause to a small, useful set of keywords.
- Avoid generic words from `data/keyword-blacklist.json`.
- After adding keywords, run `npm run data:audit`.
- If some valuable keywords still have no relation hit, supplement the appropriate relation JSON.
- Re-run `npm run data:audit`.
- Run `npm run db:sync` if the batch is in a good state.

Output:
- List changed files
- Say whether the batch changed clause-side, relation-side, or both
- Report audit metrics before/after for `emptyKeywordClauses` and `keywordsWithoutHit`
- Say whether SQLite was synced
```

## How To Reuse

- Replace the clause file list with the next batch.
- If the task is relation-only, remove the clause section and point directly to the target relation JSON file.
- Keep the batch small enough to finish with audit and sync in one pass.
