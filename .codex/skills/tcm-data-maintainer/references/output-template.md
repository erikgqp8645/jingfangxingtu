# Output Template

Use this structure when reporting completed work.

## Short Version

```text
Work type:
- clause-side / relation-side / both

Changed files:
- <file 1>
- <file 2>

Audit:
- emptyKeywordClauses: <before -> after or current>
- keywordsWithoutHit: <before -> after or current>
- relationOnlyTxt: <before -> after or current>

SQLite:
- synced / not synced
- command: <command or none>

Notes:
- <important constraint, unresolved issue, or next recommended step>
```

## Full Version

```text
Task mode:
- <mode>

Scope:
- <book or file group>

Changed files:
- <file 1>
- <file 2>
- <file 3>

What changed:
- <short factual summary 1>
- <short factual summary 2>

Audit result:
- totalIssues: <before -> after or current>
- emptyKeywordClauses: <before -> after or current>
- keywordsWithoutHit: <before -> after or current>
- relationOnlyTxt: <before -> after or current>

SQLite sync:
- status: synced / not synced
- command: <db:sync or single import command>

Next step:
- <one concrete recommended next move>
```

## Reporting Rules

- Keep the report factual and short.
- Mention exact commands if validation or sync was run.
- If audit got worse in one metric but better overall, say that explicitly.
- If SQLite was not synced, say why.
