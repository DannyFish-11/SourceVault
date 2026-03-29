'use client';

import React, { useState } from 'react';
import { Layout } from '@/components/Layout';
import { Panel } from '@/components/Panel';
import { Table } from '@/components/Table';
import { Tag } from '@/components/Tag';
import { Button } from '@/components/Button';
import { mockArtifacts } from '@/lib/mockData';
import { Artifact, ArtifactStatus } from '@/lib/types';
import styles from './page.module.css';

export default function Vault() {
  const [statusFilter, setStatusFilter] = useState<ArtifactStatus | 'all'>('all');

  const savedArtifacts = mockArtifacts.filter(
    (a) => a.status === 'saved' || a.status === 'archived'
  );

  const filteredArtifacts =
    statusFilter === 'all'
      ? savedArtifacts
      : savedArtifacts.filter((a) => a.status === statusFilter);

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }).format(date);
  };

  const columns = [
    {
      key: 'title',
      label: 'Title',
      width: '40%',
      render: (item: Artifact) => (
        <a href={`/artifact/${item.id}`} className={styles.titleLink}>
          {item.title}
        </a>
      ),
    },
    {
      key: 'trust',
      label: 'Trust',
      width: '10%',
      render: (item: Artifact) => (
        <Tag variant="trust" trustLevel={item.trustLevel}>
          {item.trustLevel}
        </Tag>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      width: '10%',
      render: (item: Artifact) => <Tag>{item.status}</Tag>,
    },
    {
      key: 'saved',
      label: 'Saved',
      width: '15%',
      render: (item: Artifact) => (
        <span className={styles.date}>{formatDate(item.discoveredAt)}</span>
      ),
    },
    {
      key: 'source',
      label: 'Source',
      width: '15%',
      render: (item: Artifact) => (
        <a href={item.url} target="_blank" rel="noopener noreferrer" className={styles.sourceLink}>
          View source →
        </a>
      ),
    },
  ];

  return (
    <Layout>
      <div className={styles.header}>
        <h1>Vault</h1>
        <p className={styles.subtitle}>Saved research materials and evidence</p>
      </div>

      <div className={styles.controls}>
        <div className={styles.filters}>
          <label className={styles.filterLabel}>Status:</label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as ArtifactStatus | 'all')}
            className={styles.select}
          >
            <option value="all">All</option>
            <option value="saved">Saved</option>
            <option value="archived">Archived</option>
          </select>
        </div>
        <div className={styles.count}>
          {filteredArtifacts.length} items
        </div>
      </div>

      <Panel>
        <Table
          columns={columns}
          data={filteredArtifacts}
          keyExtractor={(item) => item.id}
        />
      </Panel>
    </Layout>
  );
}
