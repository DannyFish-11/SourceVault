import { v4 as uuidv4 } from 'uuid';
import { SQLiteAdapter } from '../storage';

export type AuthType = 'path' | 'api_key' | 'token' | 'oauth' | 'service_account';
export type CredentialStatus = 'valid' | 'invalid' | 'expired' | 'unverified';

export interface CredentialRecord {
  id: string;
  target: string;
  authType: AuthType;
  label: string;
  valueRef: string;
  status: CredentialStatus;
  createdAt: Date;
  updatedAt: Date;
  lastVerifiedAt?: Date;
  expiresAt?: Date;
  metadata?: Record<string, unknown>;
}

export interface CredentialInput {
  target: string;
  authType: AuthType;
  label: string;
  value: string;
  expiresAt?: Date;
  metadata?: Record<string, unknown>;
}

export class CredentialManager {
  private storage: SQLiteAdapter;

  constructor(storage: SQLiteAdapter) {
    this.storage = storage;
  }

  async createCredential(input: CredentialInput): Promise<CredentialRecord> {
    const id = uuidv4();
    const now = new Date();

    // Store the actual credential value securely
    // In production, this should use OS keychain or encrypted storage
    const valueRef = this.storeSecureValue(input.value);

    const credential: CredentialRecord = {
      id,
      target: input.target,
      authType: input.authType,
      label: input.label,
      valueRef,
      status: 'unverified',
      createdAt: now,
      updatedAt: now,
      expiresAt: input.expiresAt,
      metadata: input.metadata,
    };

    this.storage.createCredential(credential);
    return credential;
  }

  async getCredential(id: string): Promise<CredentialRecord | null> {
    return this.storage.getCredential(id);
  }

  async getCredentialsByTarget(target: string): Promise<CredentialRecord[]> {
    return this.storage.getCredentialsByTarget(target);
  }

  async updateCredentialStatus(
    id: string,
    status: CredentialStatus,
    lastVerifiedAt?: Date
  ): Promise<void> {
    this.storage.updateCredentialStatus(id, status, lastVerifiedAt);
  }

  async deleteCredential(id: string): Promise<void> {
    const credential = await this.getCredential(id);
    if (credential) {
      this.deleteSecureValue(credential.valueRef);
      this.storage.deleteCredential(id);
    }
  }

  async verifyCredential(id: string): Promise<boolean> {
    const credential = await this.getCredential(id);
    if (!credential) {
      return false;
    }

    // Check if expired
    if (credential.expiresAt && credential.expiresAt < new Date()) {
      await this.updateCredentialStatus(id, 'expired');
      return false;
    }

    // Verify based on target type
    const isValid = await this.performVerification(credential);

    const status: CredentialStatus = isValid ? 'valid' : 'invalid';
    await this.updateCredentialStatus(id, status, new Date());

    return isValid;
  }

  async getCredentialValue(id: string): Promise<string | null> {
    const credential = await this.getCredential(id);
    if (!credential) {
      return null;
    }

    return this.retrieveSecureValue(credential.valueRef);
  }

  async refreshCredential(id: string): Promise<boolean> {
    const credential = await this.getCredential(id);
    if (!credential) {
      return false;
    }

    // Only OAuth and service accounts typically need refresh
    if (credential.authType !== 'oauth' && credential.authType !== 'service_account') {
      return false;
    }

    // Implement refresh logic based on target
    const refreshed = await this.performRefresh(credential);

    if (refreshed) {
      await this.updateCredentialStatus(id, 'valid', new Date());
    }

    return refreshed;
  }

  private storeSecureValue(value: string): string {
    // In production, use OS keychain or encrypted storage
    // For now, store in environment or encrypted file
    const ref = `cred_${uuidv4()}`;

    // TODO: Implement secure storage
    // For MVP, store in memory or encrypted file
    process.env[ref] = value;

    return ref;
  }

  private retrieveSecureValue(ref: string): string | null {
    // TODO: Implement secure retrieval
    return process.env[ref] || null;
  }

  private deleteSecureValue(ref: string): void {
    // TODO: Implement secure deletion
    delete process.env[ref];
  }

  private async performVerification(credential: CredentialRecord): Promise<boolean> {
    const value = this.retrieveSecureValue(credential.valueRef);
    if (!value) {
      return false;
    }

    switch (credential.target) {
      case 'perplexity':
        return this.verifyPerplexity(value);

      case 'github':
        return this.verifyGitHub(value);

      case 'obsidian':
        return this.verifyObsidian(value);

      case 'usb':
        return this.verifyUSB(value);

      case 'notion':
        return this.verifyNotion(value);

      default:
        return false;
    }
  }

  private async verifyPerplexity(apiKey: string): Promise<boolean> {
    try {
      const response = await fetch('https://api.perplexity.ai/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'llama-3.1-sonar-small-128k-online',
          messages: [{ role: 'user', content: 'test' }],
          max_tokens: 1,
        }),
      });

      return response.ok || response.status === 400; // 400 is OK, means auth worked
    } catch {
      return false;
    }
  }

  private async verifyGitHub(token: string): Promise<boolean> {
    try {
      const response = await fetch('https://api.github.com/user', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/vnd.github.v3+json',
        },
      });

      return response.ok;
    } catch {
      return false;
    }
  }

  private async verifyObsidian(path: string): Promise<boolean> {
    const fs = await import('fs');
    return fs.existsSync(path) && fs.statSync(path).isDirectory();
  }

  private async verifyUSB(path: string): Promise<boolean> {
    const fs = await import('fs');
    const markerPath = `${path}/.sourcevault`;
    return fs.existsSync(markerPath);
  }

  private async verifyNotion(token: string): Promise<boolean> {
    try {
      const response = await fetch('https://api.notion.com/v1/users/me', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Notion-Version': '2022-06-28',
        },
      });

      return response.ok;
    } catch {
      return false;
    }
  }

  private async performRefresh(credential: CredentialRecord): Promise<boolean> {
    // Implement OAuth refresh logic
    // This is target-specific and would require refresh tokens
    return false;
  }
}
