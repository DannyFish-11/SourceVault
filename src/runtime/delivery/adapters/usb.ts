import { DeliveryAdapter, DeliveryTarget } from '../index';
import { existsSync, mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';

export class USBVaultAdapter implements DeliveryAdapter {
  target: DeliveryTarget = 'usb';
  private usbPath: string;

  constructor(usbPath: string) {
    this.usbPath = usbPath;
  }

  async isConfigured(): Promise<boolean> {
    return this.usbPath !== '';
  }

  async isAvailable(): Promise<boolean> {
    if (!existsSync(this.usbPath)) {
      return false;
    }

    // Check for .sourcevault marker
    const markerPath = join(this.usbPath, '.sourcevault');
    return existsSync(markerPath);
  }

  async isEligible(item: any): Promise<boolean> {
    // USB vault requires high trust
    return item.trustLevel === 'high' || item.trustLevel === 'verified';
  }

  async serialize(item: any): Promise<any> {
    return {
      artifact: item,
      format: 'bundle',
    };
  }

  async deliver(payload: any): Promise<void> {
    const artifact = payload.artifact;
    const timestamp = new Date().toISOString().split('T')[0];
    const artifactDir = join(this.usbPath, 'artifacts', timestamp, artifact.id);

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

    // Write source.json if available
    if (artifact.source) {
      writeFileSync(
        join(artifactDir, 'source.json'),
        JSON.stringify(artifact.source, null, 2),
        'utf-8'
      );
    }

    // Write links.txt
    const linksTxt = this.generateLinksText(artifact);
    writeFileSync(join(artifactDir, 'links.txt'), linksTxt, 'utf-8');

    // Update manifest
    await this.updateManifest(artifact);
  }

  private generateSummaryMarkdown(artifact: any): string {
    return `# ${artifact.title}

**Source:** ${artifact.url}
**Published:** ${new Date(artifact.publishedAt).toISOString()}
**Trust Level:** ${artifact.trustLevel}
**Exported:** ${new Date().toISOString()}

## Summary

${artifact.summary}

## Provenance

- **ID:** ${artifact.id}
- **Source ID:** ${artifact.sourceId}
- **Discovered:** ${new Date(artifact.discoveredAt).toISOString()}
- **Status:** ${artifact.status}

## Topics

${artifact.topicIds?.map((id: string) => `- ${id}`).join('\n') || 'None'}
`;
  }

  private generateLinksText(artifact: any): string {
    let links = `Primary: ${artifact.url}\n`;

    if (artifact.metadata?.relatedLinks) {
      links += '\nRelated:\n';
      for (const link of artifact.metadata.relatedLinks) {
        links += `- ${link}\n`;
      }
    }

    return links;
  }

  private async updateManifest(artifact: any): Promise<void> {
    const manifestPath = join(this.usbPath, 'manifest.json');
    let manifest: any = { artifacts: [], lastUpdated: null };

    if (existsSync(manifestPath)) {
      const content = require('fs').readFileSync(manifestPath, 'utf-8');
      manifest = JSON.parse(content);
    }

    // Add or update artifact entry
    const existingIndex = manifest.artifacts.findIndex((a: any) => a.id === artifact.id);
    const entry = {
      id: artifact.id,
      title: artifact.title,
      url: artifact.url,
      trustLevel: artifact.trustLevel,
      exportedAt: new Date().toISOString(),
    };

    if (existingIndex >= 0) {
      manifest.artifacts[existingIndex] = entry;
    } else {
      manifest.artifacts.push(entry);
    }

    manifest.lastUpdated = new Date().toISOString();

    writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), 'utf-8');
  }
}
