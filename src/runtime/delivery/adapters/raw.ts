import { DeliveryAdapter, DeliveryTarget } from './index';
import { existsSync, mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';

export class RawVaultAdapter implements DeliveryAdapter {
  target: DeliveryTarget = 'raw';
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
    // Raw vault accepts all admitted items
    return true;
  }

  async serialize(item: any): Promise<any> {
    return {
      artifact: item,
      format: 'json',
    };
  }

  async deliver(payload: any): Promise<void> {
    const artifact = payload.artifact;
    const artifactDir = join(this.vaultPath, 'artifacts', artifact.id);

    mkdirSync(artifactDir, { recursive: true });

    // Write artifact.json
    writeFileSync(
      join(artifactDir, 'artifact.json'),
      JSON.stringify(artifact, null, 2),
      'utf-8'
    );

    // Write summary.md
    const summaryMd = this.generateSummaryMarkdown(artifact);
    writeFileSync(join(artifactDir, 'summary.md'), summaryMd, 'utf-8');

    // Write links.txt
    const linksTxt = this.generateLinksText(artifact);
    writeFileSync(join(artifactDir, 'links.txt'), linksTxt, 'utf-8');
  }

  private generateSummaryMarkdown(artifact: any): string {
    return `# ${artifact.title}

**Source:** ${artifact.url}
**Published:** ${new Date(artifact.publishedAt).toISOString()}
**Trust Level:** ${artifact.trustLevel}

## Summary

${artifact.summary}

## Metadata

- **ID:** ${artifact.id}
- **Source ID:** ${artifact.sourceId}
- **Discovered:** ${new Date(artifact.discoveredAt).toISOString()}
- **Status:** ${artifact.status}
`;
  }

  private generateLinksText(artifact: any): string {
    return `Primary: ${artifact.url}\n`;
  }
}
