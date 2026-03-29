'use client';

import React, { useEffect, useState } from 'react';
import { Layout } from '@/components/Layout';
import { Panel } from '@/components/Panel';
import { Button } from '@/components/Button';
import styles from './page.module.css';

interface RuntimeInspection {
  status: {
    running: boolean;
    syncState: any;
    queueLength: number;
    failedJobs: number;
  };
  deliveryStats: {
    pending: number;
    ready: number;
    writing: number;
    synced: number;
    failed: number;
    blocked: number;
    deferred: number;
  };
  admissionStats: {
    admitted: number;
    review: number;
    rejected: number;
  };
  targetHealth: {
    total: number;
    enabled: number;
    configured: number;
    available: number;
    unavailable: number;
  };
  targets: Array<{
    id: string;
    target: string;
    enabled: boolean;
    configured: boolean;
    available: boolean;
    mode: string;
    lastError?: string;
  }>;
  recentJobs: Array<{
    id: string;
    itemId: string;
    target: string;
    status: string;
    attempts: number;
    lastError?: string;
    createdAt: string;
  }>;
}

export default function InspectionPage() {
  const [data, setData] = useState<RuntimeInspection | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 10000); // Refresh every 10s
    return () => clearInterval(interval);
  }, []);

  const fetchData = async () => {
    try {
      const [statusRes, deliveryRes, admissionRes, targetsRes] = await Promise.all([
        fetch('/api/runtime/status'),
        fetch('/api/delivery/status'),
        fetch('/api/admission/status'),
        fetch('/api/targets'),
      ]);

      const status = await statusRes.json();
      const delivery = await deliveryRes.json();
      const admission = await admissionRes.json();
      const targets = await targetsRes.json();

      setData({
        status,
        deliveryStats: delivery.stats,
        admissionStats: admission.stats,
        targetHealth: targets.health,
        targets: targets.targets,
        recentJobs: delivery.recentJobs || [],
      });
    } catch (error) {
      console.error('Failed to fetch inspection data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchData();
  };

  const handleRecheckTargets = async () => {
    try {
      await fetch('/api/targets/recheck', { method: 'POST' });
      await fetchData();
    } catch (error) {
      console.error('Failed to recheck targets:', error);
    }
  };

  const handleRetryJob = async (jobId: string) => {
    try {
      await fetch(`/api/delivery/${jobId}/retry`, { method: 'POST' });
      await fetchData();
    } catch (error) {
      console.error('Failed to retry job:', error);
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className={styles.header}>
          <h1>Runtime Inspection</h1>
        </div>
        <Panel>
          <p>Loading inspection data...</p>
        </Panel>
      </Layout>
    );
  }

  if (!data) {
    return (
      <Layout>
        <div className={styles.header}>
          <h1>Runtime Inspection</h1>
        </div>
        <Panel>
          <p>Failed to load inspection data</p>
        </Panel>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className={styles.header}>
        <h1>Runtime Inspection</h1>
        <div className={styles.headerActions}>
          <Button onClick={handleRefresh} disabled={refreshing} variant="secondary">
            {refreshing ? 'Refreshing...' : 'Refresh'}
          </Button>
        </div>
      </div>

      <div className={styles.grid}>
        {/* Runtime Status */}
        <div className={styles.section}>
          <Panel title="Runtime Status">
            <div className={styles.statusGrid}>
              <div className={styles.statusItem}>
                <span className={styles.statusLabel}>Running</span>
                <span className={styles.statusValue} data-status={data.status.running ? 'good' : 'bad'}>
                  {data.status.running ? '✓ Yes' : '✗ No'}
                </span>
              </div>
              <div className={styles.statusItem}>
                <span className={styles.statusLabel}>Queue Length</span>
                <span className={styles.statusValue}>{data.status.queueLength || 0}</span>
              </div>
              <div className={styles.statusItem}>
                <span className={styles.statusLabel}>Failed Jobs</span>
                <span className={styles.statusValue} data-status={data.status.failedJobs > 0 ? 'warning' : 'good'}>
                  {data.status.failedJobs || 0}
                </span>
              </div>
            </div>
          </Panel>
        </div>

        {/* Delivery Stats */}
        <div className={styles.section}>
          <Panel title="Delivery Queue">
            <div className={styles.statsGrid}>
              <div className={styles.statItem}>
                <span className={styles.statLabel}>Pending</span>
                <span className={styles.statValue}>{data.deliveryStats.pending}</span>
              </div>
              <div className={styles.statItem}>
                <span className={styles.statLabel}>Ready</span>
                <span className={styles.statValue}>{data.deliveryStats.ready}</span>
              </div>
              <div className={styles.statItem}>
                <span className={styles.statLabel}>Writing</span>
                <span className={styles.statValue}>{data.deliveryStats.writing}</span>
              </div>
              <div className={styles.statItem}>
                <span className={styles.statLabel}>Synced</span>
                <span className={styles.statValue} data-status="good">{data.deliveryStats.synced}</span>
              </div>
              <div className={styles.statItem}>
                <span className={styles.statLabel}>Failed</span>
                <span className={styles.statValue} data-status="bad">{data.deliveryStats.failed}</span>
              </div>
              <div className={styles.statItem}>
                <span className={styles.statLabel}>Blocked</span>
                <span className={styles.statValue} data-status="warning">{data.deliveryStats.blocked}</span>
              </div>
              <div className={styles.statItem}>
                <span className={styles.statLabel}>Deferred</span>
                <span className={styles.statValue} data-status="warning">{data.deliveryStats.deferred}</span>
              </div>
            </div>
          </Panel>
        </div>

        {/* Admission Stats */}
        <div className={styles.section}>
          <Panel title="Vault Admission">
            <div className={styles.statsGrid}>
              <div className={styles.statItem}>
                <span className={styles.statLabel}>Admitted</span>
                <span className={styles.statValue} data-status="good">{data.admissionStats.admitted}</span>
              </div>
              <div className={styles.statItem}>
                <span className={styles.statLabel}>Review</span>
                <span className={styles.statValue} data-status="warning">{data.admissionStats.review}</span>
              </div>
              <div className={styles.statItem}>
                <span className={styles.statLabel}>Rejected</span>
                <span className={styles.statValue}>{data.admissionStats.rejected}</span>
              </div>
            </div>
          </Panel>
        </div>

        {/* Target Health */}
        <div className={styles.section}>
          <Panel title="Target Health">
            <div className={styles.targetHealth}>
              <div className={styles.healthSummary}>
                <div className={styles.healthItem}>
                  <span className={styles.healthLabel}>Total</span>
                  <span className={styles.healthValue}>{data.targetHealth.total}</span>
                </div>
                <div className={styles.healthItem}>
                  <span className={styles.healthLabel}>Enabled</span>
                  <span className={styles.healthValue}>{data.targetHealth.enabled}</span>
                </div>
                <div className={styles.healthItem}>
                  <span className={styles.healthLabel}>Available</span>
                  <span className={styles.healthValue} data-status="good">{data.targetHealth.available}</span>
                </div>
                <div className={styles.healthItem}>
                  <span className={styles.healthLabel}>Unavailable</span>
                  <span className={styles.healthValue} data-status="bad">{data.targetHealth.unavailable}</span>
                </div>
              </div>

              <div className={styles.targetList}>
                {data.targets.map((target) => (
                  <div key={target.id} className={styles.targetItem}>
                    <div className={styles.targetInfo}>
                      <span className={styles.targetName}>{target.target}</span>
                      <span className={styles.targetMode}>{target.mode}</span>
                    </div>
                    <div className={styles.targetStatus}>
                      <span className={styles.targetBadge} data-enabled={target.enabled}>
                        {target.enabled ? 'enabled' : 'disabled'}
                      </span>
                      <span className={styles.targetBadge} data-configured={target.configured}>
                        {target.configured ? 'configured' : 'not configured'}
                      </span>
                      <span className={styles.targetBadge} data-available={target.available}>
                        {target.available ? 'available' : 'unavailable'}
                      </span>
                    </div>
                    {target.lastError && (
                      <div className={styles.targetError}>
                        Error: {target.lastError}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <div className={styles.targetActions}>
                <Button onClick={handleRecheckTargets} variant="secondary">
                  Recheck All Targets
                </Button>
              </div>
            </div>
          </Panel>
        </div>

        {/* Recent Jobs */}
        <div className={styles.section}>
          <Panel title="Recent Jobs">
            {data.recentJobs.length === 0 ? (
              <p className={styles.emptyState}>No recent jobs</p>
            ) : (
              <div className={styles.jobList}>
                {data.recentJobs.map((job) => (
                  <div key={job.id} className={styles.jobItem}>
                    <div className={styles.jobHeader}>
                      <span className={styles.jobTarget}>{job.target}</span>
                      <span className={styles.jobStatus} data-status={job.status}>
                        {job.status}
                      </span>
                    </div>
                    <div className={styles.jobDetails}>
                      <span className={styles.jobId}>ID: {job.id.substring(0, 8)}</span>
                      <span className={styles.jobAttempts}>Attempts: {job.attempts}</span>
                    </div>
                    {job.lastError && (
                      <div className={styles.jobError}>
                        {job.lastError}
                      </div>
                    )}
                    {(job.status === 'failed' || job.status === 'deferred') && (
                      <div className={styles.jobActions}>
                        <Button onClick={() => handleRetryJob(job.id)} variant="secondary" size="small">
                          Retry
                        </Button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </Panel>
        </div>
      </div>
    </Layout>
  );
}
