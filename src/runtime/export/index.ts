import { mkdirSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';
import { SQLiteAdapter } from '../storage/index.js';
import { v4 as uuidv4 } from 'uuid';

export interface ExportFormat {
  artifactId: string;
  artifact: any;
  source: any;
  topics: any[];
  events: any[];
}

export class Exporter {
  private storage: SQLiteAdapter;

  constructor(storage: SQLiteAdapter) {
    this.storage = storage;
  }

  async exportArtifact(artifactId: string, targetPath: string): Promise<void> {
    // Get artifact data
    const artifact = this.storage.getArtifact(artifactId);
    if (!artifact) {
      throw new Error(`Artifact not found: ${artifactId}`);
    }

    const source = this.storage.getSource(artifact.sourceId);
    const topics = artifact.topicIds.map((id: string) => this.storage.getTopic(id)).filter(Boolean);
    const events = this.storage.getEventsByArtifact(artifactId);

    const exportData: ExportFormat = {
      artifactId,
      artifact,
      source,
      topics,
      events,
    };

    // Create artifact directory
    const artifactDir = join(targetPath, 'artifacts', artifactId);
    mkdirSync(artifactDir, { recursive: true });

    // Write summary.md
    const summaryMd = this.formatSummary(exportData);
    writeFileSync(join(artifactDir, 'summary.md'), summaryMd, 'utf-8');

    // Write artifact.json
    writeFileSync(
      join(artifactDir, 'artifact.json'),
      JSON.stringify(artifact, null, 2),
      'utf-8'
    );

    // Write source.json
    writeFileSync(
      join(artifactDir, 'source.json'),
      JSON.stringify(source, null, 2),
      'utf-8'
    );

    // Write links.txt
    const linksTxt = this.formatLinks(exportData);
    writeFileSync(join(artifactDir, 'links.txt'), linksTxt, 'utf-8');

    // Write events.json if any
    if (events.length > 0) {
      writeFileSync(
        join(artifactDir, 'events.json'),
        JSON.stringify(events, null, 2),
        'utf-8'
      );
    }

    this.log('info', `Exported artifact: ${artifactId}`);
  }

  private formatSummary(data: ExportFormat): string {
    const { artifact, source, topics } = data;

    let md = `# ${artifact.title}\n\n`;
    md += `**Source**: ${source.name} (${source.type})\n`;
    md += `**Trust Level**: ${artifact.trustLevel}\n`;
    md += `**Published**: ${artifact.publishedAt.toISOString()}\n`;
    md += `**Discovered**: ${artifact.discoveredAt.toISOString()}\n`;

    if (artifact.updatedAt) {
      md += `**Updated**: ${artifact.updatedAt.toISOString()}\n`;
    }

    md += `\n## Topics\n\n`;
    for (const topic of topics) {
      md += `- ${topic.name}\n`;
    }

    md += `\n## Summary\n\n`;
    md += `${artifact.summary}\n`;

    md += `\n## Source Link\n\n`;
    md += `${artifact.url}\n`;

    return md;
  }

  private formatLinks(data: ExportFormat): string {
    const { artifact, source } = data;

    let txt = `Artifact URL:\n${artifact.url}\n\n`;
    txt += `Source:\n${source.url}\n`;

    return txt;
  }

  initializeVaultStructure(targetPath: string): void {
    // Create vault directory structure
    const dirs = [
      'topics',
      'artifacts',
      'digests',
      'exports',
      'snapshots',
    ];

    for (const dir of dirs) {
      mkdirSync(join(targetPath, dir), { recursive: true });
    }

    // Create .sourcevault marker
    const markerPath = join(targetPath, '.sourcevault');
    if (!existsSync(markerPath)) {
      mkdirSync(markerPath, { recursive: true });
      writeFileSync(
        join(markerPath, 'sync-state.json'),
        JSON.stringify({ initialized: new Date().toISOString() }, null, 2),
        'utf-8'
      );
    }

    this.log('info', `Initialized vault structure: ${targetPath}`);
  }

  private log(level: 'info' | 'warn' | 'error', message: string, metadata?: Record<string, unknown>): void {
    const log = {
      id: uuidv4(),
      level,
      message,
      timestamp: new Date(),
      metadata,
    };

    this.storage.createLog(log);
    console.log(`[${level.toUpperCase()}] ${message}`, metadata || '');
  }
}
