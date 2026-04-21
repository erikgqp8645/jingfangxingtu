import type {ClauseData, RelationHit, RelationLink, RelationNode, VisibleNodeTypes} from '../types/relation';

export function buildRelationGraph(
  clause: ClauseData,
  relationHits: RelationHit[],
  visibleTypes: VisibleNodeTypes,
): {
  nodes: RelationNode[];
  links: RelationLink[];
} {
  const nodes: RelationNode[] = [];
  const links: RelationLink[] = [];
  const linkKeys = new Set<string>();
  const keywordIds = new Set<string>();
  const sourceIds = new Set<string>();
  const clauseId = `clause-${clause.id}`;

  function pushLink(source: string, target: string) {
    const key = `${source}=>${target}`;
    if (linkKeys.has(key)) return;
    links.push({source, target});
    linkKeys.add(key);
  }

  if (visibleTypes.clause) {
    nodes.push({
      id: clauseId,
      label: clause.title,
      type: 'clause',
    });
  }

  clause.keywords.forEach(keyword => {
    const keywordId = `keyword-${keyword}`;
    if (visibleTypes.keyword) {
      nodes.push({
        id: keywordId,
        label: keyword,
        type: 'keyword',
      });
    }
    if (visibleTypes.clause && visibleTypes.keyword) {
      pushLink(clauseId, keywordId);
    }
    keywordIds.add(keywordId);
  });

  relationHits.forEach(hit => {
    const sourceId = `source-${hit.sourceName}-${hit.title}`;
    if (visibleTypes.source && !sourceIds.has(sourceId)) {
      nodes.push({
        id: sourceId,
        label: `${hit.sourceName} · ${hit.title}`,
        type: 'source',
      });
      sourceIds.add(sourceId);
    }

    (hit.keywords || [hit.keyword]).forEach(keyword => {
      const keywordId = `keyword-${keyword}`;
      if (!keywordIds.has(keywordId)) return;
      if (visibleTypes.keyword && visibleTypes.source) {
        pushLink(keywordId, sourceId);
      } else if (!visibleTypes.keyword && visibleTypes.clause && visibleTypes.source) {
        pushLink(clauseId, sourceId);
      }
    });
  });

  return {nodes, links};
}
