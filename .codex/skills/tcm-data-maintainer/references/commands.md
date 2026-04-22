# Commands

Use these commands in this order unless the task clearly calls for something narrower.

## Audit

```bash
npm run data:audit
```

Use after any clause-keyword or relation-data change.

Expected outputs:

- `docs/当前数据体检报告.md`
- `docs/首批优先补充清单.md`

## Sync SQLite

```bash
npm run db:sync
```

Use after JSON data changes when the app should immediately reflect the new data from SQLite.

This command runs:

1. `npm run db:init`
2. `npm run db:import:shanghan`
3. `npm run db:import:jingui`
4. `npm run db:import:wenbing`
5. `npm run db:import:relations`

## Single-book Sync

```bash
npm run db:import:shanghan
npm run db:import:jingui
npm run db:import:wenbing
npm run db:import:relations
```

Use when only one area changed and a full sync is unnecessary.

## Type Check

```bash
npm run lint
```

Use after changing scripts, Vite middleware, or any frontend/backend code.
