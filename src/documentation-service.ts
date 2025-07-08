import { DocumentationCache } from './cache.js';

interface SearchResult {
  title: string;
  path: string;
  excerpt: string;
  score: number;
}

interface LLMSTextStructure {
  title: string;
  summary: string;
  sections: Array<{
    header: string;
    links: Array<{
      title: string;
      url: string;
      description: string;
    }>;
  }>;
}

export class DocumentationService {
  private baseUrl: string;
  private cache: DocumentationCache;
  private structure: LLMSTextStructure | null = null;

  constructor(baseUrl: string, cache: DocumentationCache) {
    this.baseUrl = baseUrl;
    this.cache = cache;
  }

  async initialize(): Promise<void> {
    try {
      const llmsText = await this.getDocumentationIndex();
      this.structure = this.parseLLMSText(llmsText);
      console.error('Documentation index loaded successfully');
    } catch (error) {
      console.error('Failed to load documentation index:', error);
    }
  }

  async getDocumentationIndex(): Promise<string> {
    const cacheKey = 'llms.txt';
    const cached = await this.cache.get(cacheKey);
    if (cached) return cached;

    const response = await fetch(`${this.baseUrl}/llms.txt`);
    if (!response.ok) {
      throw new Error(`Failed to fetch documentation index: ${response.statusText}`);
    }

    const content = await response.text();
    await this.cache.set(cacheKey, content);
    return content;
  }

  async getFullDocumentation(): Promise<string> {
    const cacheKey = 'llms-full.txt';
    const cached = await this.cache.get(cacheKey);
    if (cached) return cached;

    const response = await fetch(`${this.baseUrl}/llms-full.txt`);
    if (!response.ok) {
      throw new Error(`Failed to fetch full documentation: ${response.statusText}`);
    }

    const content = await response.text();
    await this.cache.set(cacheKey, content);
    return content;
  }

  async getDocumentationPage(path: string): Promise<string> {
    path = path.replace(/^\//, '');
    
    const cacheKey = `page:${path}`;
    const cached = await this.cache.get(cacheKey);
    if (cached) return cached;

    const response = await fetch(`${this.baseUrl}/${path}.md`);
    if (!response.ok) {
      const altResponse = await fetch(`${this.baseUrl}/${path}`);
      if (!altResponse.ok) {
        throw new Error(`Documentation page not found: ${path}`);
      }
      const content = await altResponse.text();
      await this.cache.set(cacheKey, content);
      return content;
    }

    const content = await response.text();
    await this.cache.set(cacheKey, content);
    return content;
  }

  async searchDocumentation(query: string, limit: number = 5): Promise<SearchResult[]> {
    const fullDocs = await this.getFullDocumentation();
    const queryLower = query.toLowerCase();
    const queryWords = queryLower.split(/\s+/);

    const sections = this.splitIntoSections(fullDocs);
    
    const scored = sections.map(section => {
      const sectionLower = section.toLowerCase();
      let score = 0;

      if (sectionLower.includes(queryLower)) {
        score += 10;
      }

      queryWords.forEach(word => {
        const matches = (sectionLower.match(new RegExp(word, 'g')) || []).length;
        score += matches * 2;
      });

      const firstLine = section.split('\n')[0];
      if (firstLine.toLowerCase().includes(queryLower)) {
        score += 5;
      }

      return { section, score };
    });

    const results = scored
      .filter(item => item.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map(item => this.extractSearchResult(item.section, query, item.score));

    return results;
  }

  async getRelevantContext(question: string, maxSections: number = 3): Promise<string> {
    const fullDocs = await this.getFullDocumentation();
    const sections = this.splitIntoSections(fullDocs);
    
    const questionLower = question.toLowerCase();
    const questionWords = questionLower.split(/\s+/)
      .filter(word => word.length > 3);

    const scored = sections.map(section => {
      const sectionLower = section.toLowerCase();
      let score = 0;

      questionWords.forEach(word => {
        if (sectionLower.includes(word)) {
          score += 1;
        }
      });

      return { section, score };
    });

    const relevantSections = scored
      .filter(item => item.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, maxSections)
      .map(item => item.section);

    return relevantSections.join('\n\n---\n\n');
  }

  private splitIntoSections(content: string): string[] {
    const sections = content.split(/^#{1,3}\s+/m);
    
    const reconstructed: string[] = [];
    const headerMatches = content.match(/^#{1,3}\s+.+$/gm) || [];
    
    sections.forEach((section, index) => {
      if (index === 0 && section.trim()) {
        reconstructed.push(section.trim());
      } else if (index > 0 && headerMatches[index - 1]) {
        reconstructed.push(headerMatches[index - 1] + '\n' + section.trim());
      }
    });

    return reconstructed.filter(s => s.length > 50);
  }

  private extractSearchResult(section: string, query: string, score: number): SearchResult {
    const lines = section.split('\n');
    const title = lines[0].replace(/^#+\s+/, '');
    
    const queryLower = query.toLowerCase();
    let excerpt = '';
    
    for (const line of lines.slice(1)) {
      if (line.toLowerCase().includes(queryLower)) {
        const index = line.toLowerCase().indexOf(queryLower);
        const start = Math.max(0, index - 50);
        const end = Math.min(line.length, index + queryLower.length + 50);
        excerpt = '...' + line.substring(start, end) + '...';
        break;
      }
    }

    if (!excerpt) {
      excerpt = lines.find(line => line.trim().length > 20)?.substring(0, 150) + '...' || '';
    }

    const path = this.inferPath(title, section);

    return {
      title,
      path,
      excerpt,
      score
    };
  }

  private inferPath(title: string, content: string): string {
    const titleSlug = title.toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');

    if (content.includes('API') || title.includes('API')) {
      return `api-reference/${titleSlug}`;
    } else if (content.includes('guide') || title.includes('Guide')) {
      return `guides/${titleSlug}`;
    } else if (content.includes('tutorial') || title.includes('Tutorial')) {
      return `tutorials/${titleSlug}`;
    }

    return titleSlug;
  }

  private parseLLMSText(content: string): LLMSTextStructure {
    const lines = content.split('\n');
    const structure: LLMSTextStructure = {
      title: '',
      summary: '',
      sections: []
    };

    let currentSection: any = null;
    let inSummary = false;

    for (const line of lines) {
      const trimmed = line.trim();

      if (trimmed.startsWith('# ')) {
        structure.title = trimmed.substring(2);
        inSummary = true;
      } else if (trimmed.startsWith('## ')) {
        inSummary = false;
        currentSection = {
          header: trimmed.substring(3),
          links: []
        };
        structure.sections.push(currentSection);
      } else if (trimmed.startsWith('- [') && currentSection) {
        const match = trimmed.match(/- \[([^\]]+)\]\(([^)]+)\)(?:\s*:\s*(.+))?/);
        if (match) {
          currentSection.links.push({
            title: match[1],
            url: match[2],
            description: match[3] || ''
          });
        }
      } else if (inSummary && trimmed) {
        structure.summary += (structure.summary ? ' ' : '') + trimmed;
      }
    }

    return structure;
  }
}