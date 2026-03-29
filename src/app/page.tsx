'use client';

import React from 'react';
import { Layout } from '@/components/Layout';
import { Panel } from '@/components/Panel';
import { Table } from '@/components/Table';
import { Tag } from '@/components/Tag';
import { Row } from '@/components/Row';
import { SourceBadge } from '@/components/SourceBadge';
import { RuntimeStatus } from '@/components/RuntimeStatus';
import { mockArtifacts, mockTopics, mockSources } from '@/lib/mockData';
import { Artifact } from '@/lib/types';
import styles from './page.module.css';

export default function Dashboard() {
  const unreviewedArtifacts = mockArtifacts.filter(a => a.status === 'new');
  const recentChanges = mockArtifacts
    .filter(a => a.updatedAt)
    .sort((a, b) => (b.updatedAt?.getTime() || 0) - (a.updatedAt?.getTime() || 0));

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }).format(date);
  };

  const reviewColumns = [
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
      key: 'source',
      label: 'Source',
      width: '20%',
      render: (item: Artifact) => {
        const source = mockSources.find(s => s.id === item.sourceId);
        return source ? <SourceBadge type={source.type} /> : null;
      },
    },
    {
      key: 'discovered',
      label: 'Discovered',
      width: '15%',
      render: (item: Artifact) => (
        <span className={styles.date}>{formatDate(item.discoveredAt)}</span>
      ),
    },
    {
      key: 'action',
      label: '',
      width: '25%',
      render: (item: Artifact) => (
        <a href={item.url} target="_blank" rel="noopener noreferrer" className={styles.sourceLink}>
          Verify source →
        </a>
      ),
    },
  ];

  return (
    <Layout>
      <div className={styles.header}>
        <h1>Dashboard</h1>
        <p className={styles.subtitle}>Last updated: 2 hours ago</p>
      </div>

      <div className={styles.grid}>
        <div className={styles.section}>
          <Panel title="Runtime Status">
            <RuntimeStatus />
          </Panel>
        </div>

        <div className={styles.section}>
          <Panel title="Today's Digest">
            <div className={styles.digest}>
              <p className={styles.digestSummary}>
                {mockArtifacts.length} sources tracked. {unreviewedArtifacts.length} items need review. {recentChanges.length} updates detected.
              </p>
              <div className={styles.digestContent}>
                <div className={styles.digestItem}>
                  <h3 className={styles.digestHeading}>Breaking changes</h3>
                  <p className={styles.digestText}>
                    React 19 RC updated with changes to Suspense API. Official migration guide published.
                  </p>
                  <a href="/artifact/1" className={styles.digestLink}>View artifact →</a>
                </div>
                <div className={styles.digestItem}>
                  <h3 className={styles.digestHeading}>New research</h3>
                  <p className={styles.digestText}>
                    Transformer architecture paper added to Machine Learning topic. High-trust source from arXiv.
                  </p>
                  <a href="/artifact/2" className={styles.digestLink}>View artifact →</a>
                </div>
              </div>
            </div>
          </Panel>
        </div>

        <div className={styles.section}>
          <Panel title="Needs Review">
            <Table
              columns={reviewColumns}
              data={unreviewedArtifacts}
              keyExtractor={(item) => item.id}
            />
          </Panel>
        </div>

        <div className={styles.section}>
          <Panel title="Topic Activity">
            <div className={styles.topicList}>
              {mockTopics.map((topic) => (
                <Row key={topic.id}>
                  <div className={styles.topicRow}>
                    <a href={`/topic/${topic.id}`} className={styles.topicLink}>
                      {topic.name}
                    </a>
                    <span className={styles.topicActivity}>
                      {topic.artifactCount} items tracked
                    </span>
                  </div>
                </Row>
              ))}
            </div>
          </Panel>
        </div>
      </div>
    </Layout>
  );
}
