import React, {useEffect, useRef} from 'react';
import * as d3 from 'd3';
import type {RelationLink, RelationNode} from '../types/relation';

interface GraphViewProps {
  nodes: RelationNode[];
  links: RelationLink[];
}

const colorMap: Record<RelationNode['type'], string> = {
  clause: '#B48464',
  keyword: '#D4A373',
  source: '#7C8974',
};

const radiusMap: Record<RelationNode['type'], number> = {
  clause: 26,
  keyword: 20,
  source: 18,
};

export const GraphView: React.FC<GraphViewProps> = ({nodes, links}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const width = containerRef.current.clientWidth;
    const height = containerRef.current.clientHeight;

    d3.select(containerRef.current).selectAll('*').remove();

    const svg = d3
      .select(containerRef.current)
      .append('svg')
      .attr('width', width)
      .attr('height', height)
      .attr('viewBox', [0, 0, width, height])
      .attr('style', 'max-width: 100%; height: auto;');

    const simNodes = nodes.map(node => ({...node}));
    const simLinks = links.map(link => ({...link}));

    const simulation = d3
      .forceSimulation(simNodes as any)
      .force('link', d3.forceLink(simLinks).id((d: any) => d.id).distance((d: any) => (d.source.id?.startsWith('clause-') ? 120 : 150)))
      .force('charge', d3.forceManyBody().strength(-480))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collide', d3.forceCollide().radius((d: any) => (radiusMap[d.type] || 18) + 22));

    const link = svg
      .append('g')
      .attr('stroke', '#E6E2D6')
      .attr('stroke-opacity', 0.9)
      .selectAll('line')
      .data(simLinks)
      .join('line')
      .attr('stroke-width', 2);

    const node = svg
      .append('g')
      .selectAll('g')
      .data(simNodes)
      .join('g')
      .call(
        d3
          .drag<any, any>()
          .on('start', dragstarted)
          .on('drag', dragged)
          .on('end', dragended),
      );

    node
      .append('circle')
      .attr('r', (d: any) => radiusMap[d.type] || 18)
      .attr('fill', (d: any) => colorMap[d.type] || '#999')
      .attr('stroke', '#fff')
      .attr('stroke-width', 2);

    node
      .append('text')
      .text((d: any) => d.label)
      .attr('x', (d: any) => (radiusMap[d.type] || 18) + 8)
      .attr('y', 5)
      .attr('font-size', (d: any) => (d.type === 'clause' ? '13px' : '12px'))
      .attr('fill', '#2C2925')
      .attr('font-weight', (d: any) => (d.type === 'clause' ? 'bold' : 'normal'))
      .attr('stroke', 'none')
      .attr('font-family', 'sans-serif');

    simulation.on('tick', () => {
      link
        .attr('x1', (d: any) => d.source.x)
        .attr('y1', (d: any) => d.source.y)
        .attr('x2', (d: any) => d.target.x)
        .attr('y2', (d: any) => d.target.y);

      node.attr('transform', (d: any) => `translate(${d.x},${d.y})`);
    });

    function dragstarted(event: any) {
      if (!event.active) simulation.alphaTarget(0.3).restart();
      event.subject.fx = event.subject.x;
      event.subject.fy = event.subject.y;
    }

    function dragged(event: any) {
      event.subject.fx = event.x;
      event.subject.fy = event.y;
    }

    function dragended(event: any) {
      if (!event.active) simulation.alphaTarget(0);
      event.subject.fx = null;
      event.subject.fy = null;
    }

    return () => {
      simulation.stop();
    };
  }, [nodes, links]);

  return <div ref={containerRef} className="w-full h-full bg-transparent" />;
};
