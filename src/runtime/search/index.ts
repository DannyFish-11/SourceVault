import { v4 as uuidv4 } from 'uuid';
import { SQLiteAdapter } from '../storage';
import { VaultAdmissionEngine, AdmissionCandidate } from '../admission';

export type SearchLayer = 'direct' | 'primary' | 'supplemental' | 'review';
export type ConnectorType = 'github' | 'arxiv' | 'perplexity';
export type SearchPriority = 'high' | 'medium' | 'low';

export interface SearchPlan {
  id: string;
  topicId?: string;
  baseQuery: string;
  layers: SearchLayer[];
  connectors: ConnectorType[];
  priority: SearchPriority;
  executedAt?: Date;
  candidateCount: number;
  createdAt: Date;
  metadata?: Record<string, unknown>;
}

export interface SearchCandidate {
  id: string;
  title: string;
  url: string;
  summary: string;
  sourceType: string;
  sourceDomain: string;
  connector: ConnectorType;
  layer: SearchLayer;
  publishedAt?: Date;
  metadata?: Record<string, unknown>;
}

export interface SearchBatch {
  planId: string;
  topicId?: string;
  baseQuery: string;
  executedAt: Date;
  candidates: SearchCandidate[];
  connectorStats: Record<ConnectorType, number>;
}

export interface Connector {
  type: ConnectorType;
  search(query: string, layer: SearchLayer): Promise<SearchCandidate[]>;
  isAvailable(): Promise<boolean>;
}

export class SearchOrchestrator {
  private storage: SQLiteAdapter;
  private admissionEngine: VaultAdmissionEngine;
  private connectors: Map<ConnectorType, Connector>;

  constructor(storage: SQLiteAdapter, admissionEngine: VaultAdmissionEngine) {
    this.storage = storage;
    this.admissionEngine = admissionEngine;
    this.connectors = new Map();
  }

  registerConnector(connector: Connector): void {
    this.connectors.set(connector.type, connector);
  }

  async executeSearch(plan: SearchPlan): Promise<SearchBatch> {
    const candidates: SearchCandidate[] = [];
    const connectorStats: Record<ConnectorType, number> = {
      github: 0,
      arxiv: 0,
      perplexity: 0,
    };

    // Execute search in layer order
    for (const layer of plan.layers) {
      const layerCandidates = await this.searchLayer(plan, layer);
      candidates.push(...layerCandidates);

      // Update connector stats
      for (const candidate of layerCandidates) {
        connectorStats[candidate.connector]++;
      }

      // Check if we have enough coverage
      if (layer === 'primary' && candidates.length === 0) {
        // No primary candidates found, continue to supplemental
        continue;
      }

      // If we have good primary coverage, skip supplemental
      if (layer === 'primary' && candidates.length >= 5) {
        break;
      }
    }

    // Deduplicate candidates
    const deduped = this.deduplicateCandidates(candidates);

    // Update search plan
    this.storage.updateSearchPlan(plan.id, {
      executedAt: new Date(),
      candidateCount: deduped.length,
    });

    const batch: SearchBatch = {
      planId: plan.id,
      topicId: plan.topicId,
      baseQuery: plan.baseQuery,
      executedAt: new Date(),
      candidates: deduped,
      connectorStats,
    };

    return batch;
  }

  private async searchLayer(plan: SearchPlan, layer: SearchLayer): Promise<SearchCandidate[]> {
    const candidates: SearchCandidate[] = [];

    // Determine which connectors to use for this layer
    const connectorsForLayer = this.getConnectorsForLayer(layer, plan.connectors);

    for (const connectorType of connectorsForLayer) {
      const connector = this.connectors.get(connectorType);
      if (!connector) continue;

      try {
        const isAvailable = await connector.isAvailable();
        if (!isAvailable) continue;

        const results = await connector.search(plan.baseQuery, layer);
        candidates.push(...results);
      } catch (error) {
        console.error(`Connector ${connectorType} failed for layer ${layer}:`, error);
        // Continue with other connectors
      }
    }

    return candidates;
  }

  private getConnectorsForLayer(layer: SearchLayer, allowedConnectors: ConnectorType[]): ConnectorType[] {
    switch (layer) {
      case 'direct':
        // Direct retrieval: GitHub, arXiv
        return allowedConnectors.filter(c => c === 'github' || c === 'arxiv');

      case 'primary':
        // Primary expansion: GitHub, arXiv
        return allowedConnectors.filter(c => c === 'github' || c === 'arxiv');

      case 'supplemental':
        // Supplemental discovery: Perplexity
        return allowedConnectors.filter(c => c === 'perplexity');

      case 'review':
        // Review-only: Perplexity with broader search
        return allowedConnectors.filter(c => c === 'perplexity');

      default:
        return [];
    }
  }

  private deduplicateCandidates(candidates: SearchCandidate[]): SearchCandidate[] {
    const seen = new Map<string, SearchCandidate>();

    for (const candidate of candidates) {
      // Dedupe by canonical URL
      const key = this.normalizeUrl(candidate.url);

      if (!seen.has(key)) {
        seen.set(key, candidate);
      } else {
        // Keep the one from higher priority layer
        const existing = seen.get(key)!;
        if (this.getLayerPriority(candidate.layer) > this.getLayerPriority(existing.layer)) {
          seen.set(key, candidate);
        }
      }
    }

    return Array.from(seen.values());
  }

  private normalizeUrl(url: string): string {
    try {
      const parsed = new URL(url);
      // Remove trailing slashes, query params, fragments
      return `${parsed.protocol}//${parsed.host}${parsed.pathname}`.replace(/\/$/, '');
    } catch {
      return url;
    }
  }

  private getLayerPriority(layer: SearchLayer): number {
    switch (layer) {
      case 'direct':
        return 4;
      case 'primary':
        return 3;
      case 'supplemental':
        return 2;
      case 'review':
        return 1;
      default:
        return 0;
    }
  }

  async processBatch(batch: SearchBatch): Promise<void> {
    for (const candidate of batch.candidates) {
      // Calculate trust score
      const trustScore = this.calculateTrustScore(candidate);

      // Create admission candidate
      const admissionCandidate: AdmissionCandidate = {
        id: candidate.id,
        itemType: 'artifact',
        title: candidate.title,
        url: candidate.url,
        sourceType: candidate.sourceType,
        sourceDomain: candidate.sourceDomain,
        trustScore,
        hasCanonicalSource: true,
        hasStableIdentifier: this.hasStableIdentifier(candidate),
        metadata: candidate.metadata,
      };

      // Evaluate admission
      const decision = await this.admissionEngine.evaluate(admissionCandidate);

      // If admitted, create artifact
      if (decision.decision === 'admit') {
        await this.createArtifact(candidate, trustScore);
      }
    }
  }

  private calculateTrustScore(candidate: SearchCandidate): number {
    let score = 0.5; // Base score

    // Source type bonus
    if (candidate.sourceType === 'github') score += 0.2;
    if (candidate.sourceType === 'arxiv') score += 0.3;
    if (candidate.sourceType === 'official_docs') score += 0.2;

    // Layer bonus
    if (candidate.layer === 'direct') score += 0.1;
    if (candidate.layer === 'primary') score += 0.05;

    // Domain trust
    if (this.isTrustedDomain(candidate.sourceDomain)) score += 0.1;

    return Math.min(score, 1.0);
  }

  private isTrustedDomain(domain: string): boolean {
    const trustedDomains = [
      'github.com',
      'arxiv.org',
      'docs.python.org',
      'nodejs.org',
      'rust-lang.org',
    ];
    return trustedDomains.some(trusted => domain.includes(trusted));
  }

  private hasStableIdentifier(candidate: SearchCandidate): boolean {
    // GitHub repos have stable identifiers
    if (candidate.sourceType === 'github' && candidate.url.includes('github.com')) {
      return true;
    }

    // arXiv papers have stable identifiers
    if (candidate.sourceType === 'arxiv' && candidate.url.includes('arxiv.org')) {
      return true;
    }

    return false;
  }

  private async createArtifact(candidate: SearchCandidate, trustScore: number): Promise<void> {
    // Create source if not exists
    const sourceId = uuidv4();
    this.storage.createSource({
      id: sourceId,
      type: candidate.sourceType,
      url: candidate.url,
      name: candidate.sourceDomain,
      trustLevel: trustScore >= 0.7 ? 'high' : trustScore >= 0.5 ? 'medium' : 'low',
      lastChecked: new Date(),
      metadata: candidate.metadata,
    });

    // Create artifact
    const artifactId = candidate.id;
    this.storage.createArtifact({
      id: artifactId,
      sourceId,
      title: candidate.title,
      summary: candidate.summary,
      url: candidate.url,
      publishedAt: candidate.publishedAt || new Date(),
      discoveredAt: new Date(),
      trustLevel: trustScore >= 0.7 ? 'high' : trustScore >= 0.5 ? 'medium' : 'low',
      status: 'new',
      metadata: candidate.metadata,
    });
  }

  async createSearchPlan(
    baseQuery: string,
    topicId?: string,
    layers?: SearchLayer[],
    connectors?: ConnectorType[],
    priority?: SearchPriority
  ): Promise<SearchPlan> {
    const plan: SearchPlan = {
      id: uuidv4(),
      topicId,
      baseQuery,
      layers: layers || ['direct', 'primary', 'supplemental'],
      connectors: connectors || ['github', 'arxiv', 'perplexity'],
      priority: priority || 'medium',
      candidateCount: 0,
      createdAt: new Date(),
    };

    this.storage.createSearchPlan(plan);
    return plan;
  }
}
