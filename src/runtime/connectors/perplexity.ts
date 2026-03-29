import { Connector, ConnectorType, SearchLayer, SearchCandidate } from '../search';
import { v4 as uuidv4 } from 'uuid';

export class PerplexityConnector implements Connector {
  type: ConnectorType = 'perplexity';
  private apiKey: string;
  private apiEndpoint = 'https://api.perplexity.ai/chat/completions';

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async isAvailable(): Promise<boolean> {
    if (!this.apiKey) return false;

    try {
      const response = await fetch(this.apiEndpoint, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'llama-3.1-sonar-small-128k-online',
          messages: [{ role: 'user', content: 'test' }],
          max_tokens: 1,
        }),
      });

      return response.ok || response.status === 400; // 400 means auth worked
    } catch {
      return false;
    }
  }

  async search(query: string, layer: SearchLayer): Promise<SearchCandidate[]> {
    const searchQuery = this.buildSearchQuery(query, layer);
    const response = await this.performSearch(searchQuery);
    return this.parseResponse(response, layer);
  }

  private buildSearchQuery(query: string, layer: SearchLayer): string {
    switch (layer) {
      case 'direct':
        return `Find the official source or primary documentation for: ${query}. Return only canonical URLs from official sites, GitHub repositories, or arXiv papers.`;

      case 'primary':
        return `Find primary sources related to: ${query}. Focus on official documentation, GitHub repositories, arXiv papers, and release announcements. Exclude blog posts and secondary commentary.`;

      case 'supplemental':
        return `Find additional authoritative sources about: ${query}. Include official project pages, technical documentation, and well-cited resources. Prioritize primary sources over secondary analysis.`;

      case 'review':
        return `Find contextual materials about: ${query}. Include technical analysis, well-cited explanations, and forum discussions with strong source links. Mark as review-only.`;

      default:
        return query;
    }
  }

  private async performSearch(query: string): Promise<any> {
    const response = await fetch(this.apiEndpoint, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.1-sonar-large-128k-online',
        messages: [
          {
            role: 'system',
            content: 'You are a research assistant that finds and extracts primary sources. Return results as a JSON array with fields: title, url, summary, sourceType, sourceDomain. Focus on official documentation, GitHub repos, arXiv papers, and canonical sources.',
          },
          {
            role: 'user',
            content: query,
          },
        ],
        max_tokens: 2000,
        temperature: 0.2,
        return_citations: true,
        return_images: false,
      }),
    });

    if (!response.ok) {
      throw new Error(`Perplexity API error: ${response.statusText}`);
    }

    return response.json();
  }

  private parseResponse(response: any, layer: SearchLayer): SearchCandidate[] {
    const candidates: SearchCandidate[] = [];

    try {
      const content = response.choices[0]?.message?.content || '';
      const citations = response.citations || [];

      // Try to parse JSON from content
      let results: any[] = [];
      try {
        const jsonMatch = content.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
          results = JSON.parse(jsonMatch[0]);
        }
      } catch {
        // If JSON parsing fails, extract from citations
        results = citations.map((url: string) => ({
          url,
          title: this.extractTitleFromUrl(url),
          summary: '',
        }));
      }

      // Convert to SearchCandidates
      for (const result of results) {
        if (!result.url) continue;

        const domain = this.extractDomain(result.url);
        const sourceType = this.inferSourceType(result.url, domain);

        candidates.push({
          id: uuidv4(),
          title: result.title || this.extractTitleFromUrl(result.url),
          url: result.url,
          summary: result.summary || '',
          sourceType,
          sourceDomain: domain,
          connector: 'perplexity',
          layer,
          metadata: {
            perplexityResponse: true,
            rawResult: result,
          },
        });
      }

      // Also add citations as candidates
      for (const citation of citations) {
        if (typeof citation !== 'string') continue;

        const domain = this.extractDomain(citation);
        const sourceType = this.inferSourceType(citation, domain);

        // Skip if already added
        if (candidates.some(c => c.url === citation)) continue;

        candidates.push({
          id: uuidv4(),
          title: this.extractTitleFromUrl(citation),
          url: citation,
          summary: '',
          sourceType,
          sourceDomain: domain,
          connector: 'perplexity',
          layer,
          metadata: {
            fromCitation: true,
          },
        });
      }
    } catch (error) {
      console.error('Failed to parse Perplexity response:', error);
    }

    return candidates;
  }

  private extractDomain(url: string): string {
    try {
      const parsed = new URL(url);
      return parsed.hostname;
    } catch {
      return 'unknown';
    }
  }

  private inferSourceType(url: string, domain: string): string {
    if (url.includes('github.com')) return 'github';
    if (url.includes('arxiv.org')) return 'arxiv';
    if (domain.includes('docs.') || url.includes('/docs/')) return 'official_docs';
    if (url.includes('/releases/') || url.includes('/release/')) return 'release_page';
    return 'web';
  }

  private extractTitleFromUrl(url: string): string {
    try {
      const parsed = new URL(url);
      const path = parsed.pathname;
      const segments = path.split('/').filter(s => s);

      if (segments.length > 0) {
        return segments[segments.length - 1]
          .replace(/[-_]/g, ' ')
          .replace(/\.(html|md|pdf)$/, '');
      }

      return parsed.hostname;
    } catch {
      return url;
    }
  }
}
