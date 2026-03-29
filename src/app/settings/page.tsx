'use client';

import React, { useEffect, useState } from 'react';
import { Layout } from '@/components/Layout';
import { Panel } from '@/components/Panel';
import { Button } from '@/components/Button';
import styles from './page.module.css';

interface Settings {
  usbVaultPath: string;
  usbVaultName: string;
  scheduleInterval: number;
  autoSync: boolean;
  maxRetries: number;
  policyMode: 'strict' | 'balanced' | 'broad';
  trustThreshold: number;
}

interface Credential {
  id: string;
  target: string;
  authType: string;
  label: string;
  status: string;
  createdAt: string;
  lastVerifiedAt?: string;
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<Settings>({
    usbVaultPath: '',
    usbVaultName: '',
    scheduleInterval: 60,
    autoSync: true,
    maxRetries: 3,
    policyMode: 'strict',
    trustThreshold: 0.7,
  });
  const [credentials, setCredentials] = useState<Record<string, Credential[]>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [showAddCredential, setShowAddCredential] = useState(false);
  const [newCredential, setNewCredential] = useState({
    target: 'perplexity',
    authType: 'api_key',
    label: '',
    value: '',
  });

  useEffect(() => {
    fetchSettings();
    fetchCredentials();
  }, []);

  const fetchCredentials = async () => {
    try {
      const response = await fetch('/api/credentials');
      if (!response.ok) throw new Error('Failed to fetch credentials');
      const data = await response.json();
      setCredentials(data.credentials);
    } catch (error) {
      console.error('Failed to fetch credentials:', error);
    }
  };

  const fetchSettings = async () => {
    try {
      const response = await fetch('/api/settings');
      if (!response.ok) throw new Error('Failed to fetch settings');
      const data = await response.json();
      setSettings(data);
    } catch (error) {
      setMessage(`Error: ${String(error)}`);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);

    try {
      const response = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });

      if (!response.ok) throw new Error('Failed to save settings');

      const data = await response.json();
      setSettings(data.settings);
      setMessage('Settings saved successfully');
    } catch (error) {
      setMessage(`Error: ${String(error)}`);
    } finally {
      setSaving(false);
    }
  };

  const handleAddCredential = async () => {
    if (!newCredential.label || !newCredential.value) {
      setMessage('Error: Label and value are required');
      return;
    }

    try {
      const response = await fetch('/api/credentials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newCredential),
      });

      if (!response.ok) throw new Error('Failed to add credential');

      setMessage('Credential added successfully');
      setShowAddCredential(false);
      setNewCredential({
        target: 'perplexity',
        authType: 'api_key',
        label: '',
        value: '',
      });
      await fetchCredentials();
    } catch (error) {
      setMessage(`Error: ${String(error)}`);
    }
  };

  const handleDeleteCredential = async (id: string) => {
    try {
      const response = await fetch(`/api/credentials/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Failed to delete credential');

      setMessage('Credential deleted successfully');
      await fetchCredentials();
    } catch (error) {
      setMessage(`Error: ${String(error)}`);
    }
  };

  const handleVerifyCredential = async (id: string) => {
    try {
      const response = await fetch(`/api/credentials/${id}/verify`, {
        method: 'POST',
      });

      if (!response.ok) throw new Error('Failed to verify credential');

      const data = await response.json();
      setMessage(data.valid ? 'Credential is valid' : 'Credential is invalid');
      await fetchCredentials();
    } catch (error) {
      setMessage(`Error: ${String(error)}`);
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className={styles.header}>
          <h1>Settings</h1>
        </div>
        <Panel>
          <p>Loading settings...</p>
        </Panel>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className={styles.header}>
        <h1>Settings</h1>
        <p className={styles.subtitle}>Configure runtime, vault admission, and credentials</p>
      </div>

      <div className={styles.grid}>
        <div className={styles.section}>
          <Panel title="Vault Admission Policy">
            <div className={styles.form}>
              <div className={styles.field}>
                <label className={styles.label}>Policy Mode</label>
                <select
                  className={styles.input}
                  value={settings.policyMode}
                  onChange={(e) => setSettings({ ...settings, policyMode: e.target.value as 'strict' | 'balanced' | 'broad' })}
                >
                  <option value="strict">Strict - Primary sources only</option>
                  <option value="balanced">Balanced - Primary + high-quality secondary</option>
                  <option value="broad">Broad - More permissive discovery</option>
                </select>
                <p className={styles.hint}>
                  Controls which items are automatically admitted to the vault.
                </p>
              </div>

              <div className={styles.field}>
                <label className={styles.label}>Trust Threshold</label>
                <input
                  type="number"
                  className={styles.input}
                  value={settings.trustThreshold}
                  onChange={(e) => setSettings({ ...settings, trustThreshold: parseFloat(e.target.value) })}
                  min="0"
                  max="1"
                  step="0.1"
                />
                <p className={styles.hint}>
                  Minimum trust score for automatic admission (0.0-1.0).
                </p>
              </div>
            </div>
          </Panel>
        </div>

        <div className={styles.section}>
          <Panel title="Credentials">
            <div className={styles.form}>
              <div className={styles.credentialsList}>
                {Object.entries(credentials).map(([target, creds]) => (
                  <div key={target} className={styles.credentialGroup}>
                    <h3 className={styles.credentialTarget}>{target}</h3>
                    {creds.map((cred) => (
                      <div key={cred.id} className={styles.credentialItem}>
                        <div className={styles.credentialInfo}>
                          <span className={styles.credentialLabel}>{cred.label}</span>
                          <span className={styles.credentialStatus} data-status={cred.status}>
                            {cred.status}
                          </span>
                        </div>
                        <div className={styles.credentialActions}>
                          <Button onClick={() => handleVerifyCredential(cred.id)} variant="secondary" size="small">
                            Verify
                          </Button>
                          <Button onClick={() => handleDeleteCredential(cred.id)} variant="secondary" size="small">
                            Delete
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                ))}
              </div>

              {!showAddCredential && (
                <Button onClick={() => setShowAddCredential(true)} variant="secondary">
                  Add Credential
                </Button>
              )}

              {showAddCredential && (
                <div className={styles.addCredentialForm}>
                  <div className={styles.field}>
                    <label className={styles.label}>Target</label>
                    <select
                      className={styles.input}
                      value={newCredential.target}
                      onChange={(e) => setNewCredential({ ...newCredential, target: e.target.value })}
                    >
                      <option value="perplexity">Perplexity</option>
                      <option value="github">GitHub</option>
                      <option value="arxiv">arXiv</option>
                      <option value="obsidian">Obsidian</option>
                      <option value="notion">Notion</option>
                      <option value="notebook">Notebook</option>
                    </select>
                  </div>

                  <div className={styles.field}>
                    <label className={styles.label}>Label</label>
                    <input
                      type="text"
                      className={styles.input}
                      value={newCredential.label}
                      onChange={(e) => setNewCredential({ ...newCredential, label: e.target.value })}
                      placeholder="My API Key"
                    />
                  </div>

                  <div className={styles.field}>
                    <label className={styles.label}>Value</label>
                    <input
                      type="password"
                      className={styles.input}
                      value={newCredential.value}
                      onChange={(e) => setNewCredential({ ...newCredential, value: e.target.value })}
                      placeholder="API key or token"
                    />
                  </div>

                  <div className={styles.addCredentialActions}>
                    <Button onClick={handleAddCredential} variant="primary">
                      Add
                    </Button>
                    <Button onClick={() => setShowAddCredential(false)} variant="secondary">
                      Cancel
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </Panel>
        </div>

        <div className={styles.section}>
          <Panel title="USB Vault">
            <div className={styles.form}>
              <div className={styles.field}>
                <label className={styles.label}>USB Vault Path</label>
                <input
                  type="text"
                  className={styles.input}
                  value={settings.usbVaultPath}
                  onChange={(e) => setSettings({ ...settings, usbVaultPath: e.target.value })}
                  placeholder="/Volumes/SourceVault or /media/usb/SourceVault"
                />
                <p className={styles.hint}>
                  Full path to your USB vault directory. Must contain .sourcevault marker.
                </p>
              </div>

              <div className={styles.field}>
                <label className={styles.label}>USB Vault Name (optional)</label>
                <input
                  type="text"
                  className={styles.input}
                  value={settings.usbVaultName}
                  onChange={(e) => setSettings({ ...settings, usbVaultName: e.target.value })}
                  placeholder="SourceVault"
                />
                <p className={styles.hint}>
                  Volume name for automatic detection (future feature).
                </p>
              </div>
            </div>
          </Panel>
        </div>

        <div className={styles.section}>
          <Panel title="Runtime">
            <div className={styles.form}>
              <div className={styles.field}>
                <label className={styles.label}>Schedule Interval (minutes)</label>
                <input
                  type="number"
                  className={styles.input}
                  value={settings.scheduleInterval}
                  onChange={(e) => setSettings({ ...settings, scheduleInterval: parseInt(e.target.value, 10) })}
                  min="1"
                  max="1440"
                />
                <p className={styles.hint}>
                  How often to check for new content (1-1440 minutes).
                </p>
              </div>

              <div className={styles.field}>
                <label className={styles.checkboxLabel}>
                  <input
                    type="checkbox"
                    className={styles.checkbox}
                    checked={settings.autoSync}
                    onChange={(e) => setSettings({ ...settings, autoSync: e.target.checked })}
                  />
                  <span>Enable automatic sync</span>
                </label>
                <p className={styles.hint}>
                  Automatically sync to USB vault when connected.
                </p>
              </div>

              <div className={styles.field}>
                <label className={styles.label}>Max Retries</label>
                <input
                  type="number"
                  className={styles.input}
                  value={settings.maxRetries}
                  onChange={(e) => setSettings({ ...settings, maxRetries: parseInt(e.target.value, 10) })}
                  min="0"
                  max="10"
                />
                <p className={styles.hint}>
                  Number of retry attempts for failed exports (0-10).
                </p>
              </div>
            </div>
          </Panel>
        </div>

        <div className={styles.actions}>
          <Button onClick={handleSave} disabled={saving} variant="primary">
            {saving ? 'Saving...' : 'Save Settings'}
          </Button>
          {message && (
            <span className={message.startsWith('Error') ? styles.error : styles.success}>
              {message}
            </span>
          )}
        </div>
      </div>
    </Layout>
  );
}
