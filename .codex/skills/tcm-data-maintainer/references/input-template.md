# Input Template

Use this structure to normalize the task before starting.

## Required Fields

- `Task mode`
  One of:
  `clause-keyword batch`
  `relation-json supplement`
  `end-to-end maintenance`
  `audit-first triage`
- `Target scope`
  Exact files, exact keywords, or a small batch description

## Recommended Fields

- `Priority`
  Example: high, normal, exploratory
- `Book`
  Example: `伤寒论`, `金匮要略`, `温病条辨`
- `Clause files`
  Example:
  `data/经典/伤寒论/26.json`
  `data/经典/伤寒论/27.json`
- `Relation file`
  Example:
  `data/关联解析/467-伤寒寻源.json`
- `Must run audit`
  `yes` or `no`
- `Must sync SQLite`
  `yes` or `no`

## Minimal Example

```text
Task mode: clause-keyword batch
Target scope:
- data/经典/伤寒论/26.json
- data/经典/伤寒论/27.json
Must run audit: yes
Must sync SQLite: yes
```

## End-to-End Example

```text
Task mode: end-to-end maintenance
Book: 伤寒论
Clause files:
- data/经典/伤寒论/26.json
- data/经典/伤寒论/27.json
- data/经典/伤寒论/28.json
Relation file: auto-decide
Must run audit: yes
Must sync SQLite: yes
```

## Interpretation Rules

- If the user gives only clause files, default to `clause-keyword batch`.
- If the user gives only missing-hit keywords, default to `relation-json supplement`.
- If the user says `继续补数据`, prefer one small end-to-end batch.
- If the user says `先看看问题`, prefer `audit-first triage`.
