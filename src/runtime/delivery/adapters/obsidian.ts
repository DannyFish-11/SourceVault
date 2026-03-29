import { DeliveryAdapter, DeliveryTarget } from '../index';
import { existsSync, mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';

export class ObsidianAdapter implements DeliveryAdapter {
  target: DeliveryTarget = 'obsidian';
  private vaultPath: string;

  constructor(vaultPath: string) {
    this.vaultPath = vaultPath;
  }

  async isConfigured(): Promise<boolean> {
    return this.vaultPath !== '';
  }

  async isAvailable(): Promise<boolean> {
    return existsSync(this.vaultPath);
  }

  async isEligible(item: any): Promise<boolean> {
    // Obsidian accepts artifacts and digests
    return item.title && item.summary;
  }

  async serialize(item: any): Promise<any> {
    return {
      artifact: item,
      format: 'markdown',
    };
  }

  async deliver(payload: any): Promise<void> {
    const artifact = payload.artifact;
    const sourcevaultDir = join(this.vaultPath, 'SourceVault');
    const artifactsDir = join(sourcevaultDir, 'Artifacts');

    mkdirSync(artifactsDir, { recursive: true });

    // Generate Obsidian-friendly filename
    const filename = this.sanitizeFilename(artifact.title);
    const filepath = join(artifactsDir, `${filename}.md`);

    // Generate markdown content
    const markdown = this.generateObsidianMarkdown(artifact);
    writeFileSync(filepath, markdown, 'utf-8');
  }

  private sanitizeFilename(title: string): string {
    return title
      .replace(/[<>:"/\\|?*]/g, '')
      .replace(/\s+/g, '-')
      .substring(0, 100);
  }

  private generateObsidianMarkdown(artifact: any): string {
    const tags = artifact.topicIds?.map((id: string) => `#${id}`).join(' ') || '';
    const publishedDate = new Date(artifact.publishedAt).toISOString().split('T')[0];

    return `---
id: ${artifact.id}
source: ${artifact.url}
published: ${publishedDate}
trust: ${artifact.trustLevel}
status: ${artifact.status}
---

# ${artifact.title}

${tags}

## Summary

${artifact.summary}

## Source

- **URL:** [${artifact.url}](${artifact.url})
- **Type:** ${artifact.metadata?.sourceType || 'unknown'}
- **Trust Level:** ${artifact.trustLevel}

## Metadata

- **Discovered:** ${new Date(artifact.discoveredAt).toISOString()}
- **Source ID:** [[${artifact.sourceId}]]

## Topics

${artifact.topicIds?.map((id: string) => `- [[${id}]]`).join('\n') || 'None'}

---

*Synced from SourceVault on ${new Date().toISOString()}*
`;
  }
}
