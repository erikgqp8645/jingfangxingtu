# Keyword Rules

Use these rules when editing `data/经典/**/*.json`.

## Add

- Prefer words that appear directly in the clause text.
- Prefer symptom terms, pulse terms, syndrome terms, formula names, and key body-location terms.
- Usually add 3 to 8 keywords per clause.
- Favor stable, reusable graph terms over long explanatory phrases.

## Avoid

- Overly generic words already listed in `data/keyword-blacklist.json`
- Very long full-sentence fragments
- Large groups of synonyms unless the project explicitly wants synonym coverage

## Good Examples

- `恶寒`
- `发热`
- `脉浮紧`
- `少阳`
- `胃不和`
- `桂枝汤`

## Typical Recovery Pattern

When audit says a keyword has no relation hit, choose one:

1. Remove or simplify the keyword if it is too specific.
2. Add a matching entry to `data/关联解析/*.json` if the keyword is valuable and should drive the graph.

## Project-Specific Note

This repository currently values:

- Simpler relation graphs over overly dense knowledge-graph style expansion
- JSON-first relation matching
- TXT fallback only when JSON does not yet exist
