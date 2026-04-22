# Batch Strategy

Choose batch size and work order deliberately.

## Default Batch Sizes

### Clause-Keyword Batch

- Recommended:
  3 to 12 clause files
- Avoid:
  Large batches that cannot be audited and corrected in one pass

### Relation-JSON Supplement

- Recommended:
  3 to 10 missing-hit keywords
- Avoid:
  Rewriting an entire relation source unless the task explicitly asks for it

### End-to-End Maintenance

- Recommended:
  One small clause batch plus the relation fixes it creates

## Work Order

### When many clauses have no keywords

1. Start with early core clauses.
2. Add keywords to a small batch.
3. Run the audit.
4. If some added keywords have no relation hit, supplement relation JSON.
5. Re-run the audit.
6. Sync SQLite.

### When keywords already exist but graph hits are weak

1. Read the missing-hit list from the audit.
2. Decide which keywords are valuable enough to preserve.
3. Add relation JSON entries for the valuable ones.
4. Remove or simplify only the clearly over-specific ones.

## Switching Rule

Switch from keyword work to relation work when either condition is true:

- `keywordsWithoutHit` grows noticeably after a keyword batch
- The user cares more about right-side graph usefulness than raw keyword coverage

## Priority Rule

Prefer this order:

1. `伤寒论` early core clauses
2. Existing valuable keywords with no relation hit
3. Relation sources that are still TXT-only
4. Later clause batches

## Stop Rule

Stop the current batch when:

- The audit has been re-run
- The batch result is understandable
- SQLite has been synced if needed

Do not keep expanding the batch after validation just because more work exists.
