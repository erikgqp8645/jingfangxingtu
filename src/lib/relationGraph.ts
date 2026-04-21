import type {ClauseData, RelationHit, RelationLink, RelationNode} from '../types/relation';

export function buildRelationGraph(clause: ClauseData, relationHits: RelationHit[]): {
  nodes: RelationNode[];
  links: RelationLink[];
} {
  const nodes: RelationNode[] = [
    {
      id: `clause-${clause.id}`,
      label: clause.title,
      type: 'clause',
    },
  ];
  const links: RelationLink[] = [];
  const keywordIds = new Set<string>();
  const sourceIds = new Set<string>();

  clause.keywords.forEach(keyword => {
    const keywordId = `keyword-${keyword}`;
    nodes.push({
      id: keywordId,
      label: keyword,
      type: 'keyword',
    });
    links.push({
      source: `clause-${clause.id}`,
      target: keywordId,
    });
    keywordIds.add(keywordId);
  });

  relationHits.forEach(hit => {
    const keywordId = `keyword-${hit.keyword}`;
    if (!keywordIds.has(keywordId)) return;

    const sourceId = `source-${hit.sourceName}-${hit.title}`;
    if (!sourceIds.has(sourceId)) {
      nodes.push({
        id: sourceId,
        label: `${hit.sourceName} · ${hit.title}`,
        type: 'source',
      });
      sourceIds.add(sourceId);
    }

    links.push({
      source: keywordId,
      target: sourceId,
    });
  });

  return {nodes, links};
}
