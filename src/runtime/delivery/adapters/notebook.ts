import { DeliveryAdapter, DeliveryTarget } from '../index';

export class NotebookAdapter implements DeliveryAdapter {
  target: DeliveryTarget = 'notebook';
  private apiEndpoint: string;
  private apiKey: string;

  constructor(apiEndpoint: string, apiKey: string) {
    this.apiEndpoint = apiEndpoint;
    this.apiKey = apiKey;
  }

  async isConfigured(): Promise<boolean> {
    return this.apiEndpoint !== '' && this.apiKey !== '';
  }

  async isAvailable(): Promise<boolean> {
    try {
      const response = await fetch(`${this.apiEndpoint}/health`, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
        },
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  async isEligible(item: any): Promise<boolean> {
    // Notebook accepts manually selected items
    return true;
  }

  async serialize(item: any): Promise<any> {
    return {
      id: item.id,
      title: item.title,
      summary: item.summary,
      url: item.url,
      publishedAt: item.publishedAt,
      trustLevel: item.trustLevel,
      metadata: item.metadata,
    };
  }

  async deliver(payload: any): Promise<void> {
    const response = await fetch(`${this.apiEndpoint}/artifacts`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`Notebook delivery failed: ${response.statusText}`);
    }
  }
}
