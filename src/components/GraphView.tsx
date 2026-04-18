import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import { GraphNode, GraphLink } from '../data';

interface GraphViewProps {
  nodes: GraphNode[];
  links: GraphLink[];
}

const colorMap: Record<string, string> = {
  anchor: '#B48464', // clay
  symptom: '#E89B86',
  theory: '#D4A373',
  book: '#7C8974', // sage
  formula: '#9A7E6F',
};

export const GraphView: React.FC<GraphViewProps> = ({ nodes, links }) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const width = containerRef.current.clientWidth;
    const height = containerRef.current.clientHeight;

    // Clear previous graph
    d3.select(containerRef.current).selectAll('*').remove();

    const svg = d3
      .select(containerRef.current)
      .append('svg')
      .attr('width', width)
      .attr('height', height)
      .attr('viewBox', [0, 0, width, height])
      .attr('style', 'max-width: 100%; height: auto;');

    // Clone nodes and links to prevent D3 from mutating the prop objects
    const simNodes = nodes.map(d => ({ ...d }));
    const simLinks = links.map(d => ({ ...d }));

    const simulation = d3
      .forceSimulation(simNodes as any)
      .force(
        'link',
        d3
          .forceLink(simLinks)
          .id((d: any) => d.id)
          .distance((d: any) => d.target.id?.toString().startsWith('auto-') ? 150 : 100)
      )
      .force('charge', d3.forceManyBody().strength(-400))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collide', d3.forceCollide().radius(50));

    const link = svg
      .append('g')
      .attr('stroke', '#E6E2D6') // divider
      .attr('stroke-opacity', 0.8)
      .selectAll('line')
      .data(simLinks)
      .join('line')
      .attr('stroke-width', 2)
      .attr('stroke-dasharray', (d: any) => d.target.id?.toString().startsWith('auto-') ? '5,5' : 'none');

    const node = svg
      .append('g')
      .attr('stroke', '#fff')
      .attr('stroke-width', 1.5)
      .selectAll('g')
      .data(simNodes)
      .join('g')
      .call(
        d3
          .drag<any, any>()
          .on('start', dragstarted)
          .on('drag', dragged)
          .on('end', dragended)
      );

    node
      .append('circle')
      .attr('r', 20)
      .attr('fill', (d: any) => colorMap[d.type] || '#999')
      .attr('stroke', (d: any) => d.id?.toString().startsWith('auto-') ? '#D4A373' : '#fff')
      .attr('stroke-dasharray', (d: any) => d.id?.toString().startsWith('auto-') ? '3,3' : 'none');

    node
      .append('text')
      .text((d: any) => d.label)
      .attr('x', 25)
      .attr('y', 5)
      .attr('font-size', '12px')
      .attr('fill', (d: any) => d.id?.toString().startsWith('auto-') ? '#D4A373' : '#2C2925') // ink
      .attr('font-weight', (d: any) => d.id?.toString().startsWith('auto-') ? 'bold' : 'normal')
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

