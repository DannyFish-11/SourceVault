'use client';

import React, { useEffect, useState } from 'react';
import styles from './RuntimeStatus.module.css';
import { Button } from './Button';

interface RuntimeStatusData {
  running: boolean;
  lastCheck: string;
  syncState: {
    lastSyncAt?: string;
    usbConnected: boolean;
    usbPath?: string;
    pendingExports: number;
    failedExports: number;
    totalExports: number;
  };
  settings: {
    scheduleInterval: number;
    autoSync: boolean;
  };
}

export function RuntimeStatus() {
  const [status, setStatus] = useState<RuntimeStatusData | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchStatus = async () => {
    try {
      const response = await fetch('/api/runtime/status');
      if (!response.ok) throw new Error('Failed to fetch status');
      const data = await response.json();
      setStatus(data);
      setError(null);
    } catch (err) {
      setError(String(err));
    }
  };

  const handleManualSync = async () => {
    setSyncing(true);
    try {
      const response = await fetch('/api/runtime/sync', { method: 'POST' });
      if (!response.ok) throw new Error('Sync failed');
      await fetchStatus();
    } catch (err) {
      setError(String(err));
    } finally {
      setSyncing(false);
    }
  };

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 30000); // Refresh every 30s
    return () => clearInterval(interval);
  }, []);

  if (error) {
    return (
      <div className={styles.container}>
        <div className={styles.error}>Runtime status unavailable</div>
      </div>
    );
  }

  if (!status) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>Loading runtime status...</div>
      </div>
    );
  }

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return 'Never';
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(dateStr));
  };

  return (
    <div className={styles.container}>
      <div className={styles.row}>
        <span className={styles.label}>Runtime</span>
        <span className={styles.value}>
          {status.running ? (
            <span className={styles.statusRunning}>Running</span>
          ) : (
            <span className={styles.statusStopped}>Stopped</span>
          )}
        </span>
      </div>

      <div className={styles.row}>
        <span className={styles.label}>USB Vault</span>
        <span className={styles.value}>
          {status.syncState.usbConnected ? (
            <span className={styles.statusConnected}>Connected</span>
          ) : (
            <span className={styles.statusDisconnected}>Disconnected</span>
          )}
        </span>
      </div>

      {status.syncState.usbPath && (
        <div className={styles.row}>
          <span className={styles.label}>Path</span>
          <span className={styles.valuePath}>{status.syncState.usbPath}</span>
        </div>
      )}

      <div className={styles.row}>
        <span className={styles.label}>Last Sync</span>
        <span className={styles.value}>
          {formatDate(status.syncState.lastSyncAt)}
        </span>
      </div>

      <div className={styles.row}>
        <span className={styles.label}>Queue</span>
        <span className={styles.value}>
          {status.syncState.pendingExports} pending
          {status.syncState.failedExports > 0 && (
            <span className={styles.failed}>, {status.syncState.failedExports} failed</span>
          )}
        </span>
      </div>

      <div className={styles.row}>
        <span className={styles.label}>Total Exports</span>
        <span className={styles.value}>{status.syncState.totalExports}</span>
      </div>

      <div className={styles.actions}>
        <Button
          onClick={handleManualSync}
          disabled={syncing || !status.syncState.usbConnected}
          size="sm"
          variant="secondary"
        >
          {syncing ? 'Syncing...' : 'Sync Now'}
        </Button>
        <a href="/settings" className={styles.settingsLink}>
          Settings →
        </a>
      </div>
    </div>
  );
}
