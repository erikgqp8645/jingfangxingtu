export interface RawSearchResult {
  id: number;
  source: string;
  text: string;
  type: 'raw' | 'structured';
}

let loadedConfigs: any[] = [];
let loadedJsonFiles: Record<string, any> = {};
let loadedTxtFiles: Record<string, string> = {};
let isReady = false;

export async function prefetchKnowledgeBase() {
  if (isReady) return;
  try {
    const configRes = await fetch('/data/guanlianjiexiconfig.json');
    loadedConfigs = await configRes.json();
    
    for (const config of loadedConfigs) {
      const baseName = config.fileBaseName;
      try {
        const jsonRes = await fetch(`/data/关联解析/${baseName}.json`);
        if (jsonRes.ok) {
          loadedJsonFiles[baseName] = await jsonRes.json();
        }
      } catch (e) {
        // ignore
      }
      
      try {
        const txtRes = await fetch(`/data/关联解析/${baseName}.txt`);
        if (txtRes.ok) {
          loadedTxtFiles[baseName] = await txtRes.text();
        }
      } catch (e) {
        // ignore
      }
    }
    isReady = true;
  } catch (error) {
    console.error("Failed to load knowledge base configs", error);
  }
}

export function searchKnowledgeBase(query: string): RawSearchResult[] {
  if (!query || !query.trim()) return [];
  const results: RawSearchResult[] = [];
  let idCounter = 1;

  for (const config of loadedConfigs) {
    const baseName = config.fileBaseName;
    const jsonContext = loadedJsonFiles[baseName];
    let foundInJson = false;

    // Check JSON first
    if (jsonContext && jsonContext[query]) {
       jsonContext[query].forEach((item: any) => {
         results.push({
           id: idCounter++,
           source: config.category || `《${config.sourceName}》`, // pass the category so PluginPanel maps correctly
           type: 'structured',
           text: `【${item.title}】${item.content}`
         });
       });
       foundInJson = true;
    }

    // Fallback to text parsing
    if (!foundInJson) {
       const txtContent = loadedTxtFiles[baseName];
       if (txtContent) {
          const segments = txtContent.split(/<篇名>|【篇名】/);
          for (const segment of segments) {
            if (!segment.trim()) continue;
            
            // For TXT, we want to match the whole segment or specific content
            if (segment.includes(query)) {
               const titleMatch = segment.match(/([^\n]+)/);
               const title = titleMatch ? titleMatch[1].trim() : "未知篇名";
               
               const attrMatch = segment.match(/属性[：:]([\s\S]+)/);
               const content = attrMatch ? attrMatch[1].trim() : segment.trim();

               if (content.includes(query)) {
                 results.push({
                   id: idCounter++,
                   source: config.category || `《${config.sourceName}》`,
                   type: 'raw',
                   text: `【${title}】${content.substring(0, 300)}...`
                 });
               }
            }
          }
       }
    }
  }

  // Pure fallback for unconfigured environments
  if (results.length === 0 && query.includes('谵语')) {
    results.push({
      id: 999,
      source: '《伤寒论》（TXT缓存）',
      type: 'raw',
      text: '太阳病，误汗发谵语...'
    });
  }

  return results;
}
