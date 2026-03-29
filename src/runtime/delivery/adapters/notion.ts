import { DeliveryAdapter, DeliveryTarget } from '../index';

export class NotionAdapter implements DeliveryAdapter {
  target: DeliveryTarget = 'notion';
  private apiKey: string;
  private databaseId: string;

  constructor(apiKey: string, databaseId: string) {
    this.apiKey = apiKey;
    this.databaseId = databaseId;
  }

  async isConfigured(): Promise<boolean> {
    return this.apiKey !== '' && this.databaseId !== '';
  }

  async isAvailable(): Promise<boolean> {
    try {
      const response = await fetch(`https://api.notion.com/v1/databases/${this.databaseId}`, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Notion-Version': '2022-06-28',
        },
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  async isEligible(item: any): Promise<boolean> {
    // Notion accepts manually selected items
    return true;
  }

  async serialize(item: any): Promise<any> {
    return {
      parent: { database_id: this.databaseId },
      properties: {
        Title: {
          title: [
            {
              text: {
                content: item.title,
              },
            },
          ],
        },
        URL: {
          url: item.url,
        },
        'Trust Level': {
          select: {
            name: item.trustLevel,
          },
        },
        Published: {
          date: {
            start: new Date(item.publishedAt).toISOString(),
          },
        },
        Status: {
          select: {
            name: item.status,
          },
        },
      },
      children: [
        {
          object: 'block',
          type: 'heading_2',
          heading_2: {
            rich_text: [
              {
                type: 'text',
                text: {
                  content: 'Summary',
                },
              },
            ],
          },
        },
        {
          object: 'block',
          type: 'paragraph',
          paragraph: {
            rich_text: [
              {
                type: 'text',
                text: {
                  content: item.summary,
                },
              },
            ],
          },
        },
      ],
    };
  }

  async deliver(payload: any): Promise<void> {
    const response = await fetch('https://api.notion.com/v1/pages', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
        'Notion-Version': '2022-06-28',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Notion delivery failed: ${error}`);
    }
  }
}
