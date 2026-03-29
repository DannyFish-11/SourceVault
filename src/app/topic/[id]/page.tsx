import React from 'react';
import { Layout } from '@/components/Layout';
import { Panel } from '@/components/Panel';
import { Table } from '@/components/Table';
import { Tag } from '@/components/Tag';
import { Row } from '@/components/Row';
import { mockArtifacts, mockTopics } from '@/lib/mockData';
import { Artifact } from '@/lib/types';
import styles from './page.module.css';

export default function TopicDetail({ params }: { params: { id: string } }) {
  const topic = mockTopics.find((t) => t.id === params.id);
  const artifacts = mockArtifacts.filter((a) => a.topicIds.includes(params.id));

  if (!topic) {
    return (
      <Layout>
        <div>Topic not found</div>
      </Layout>
    );
  }

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }).format(date);
  };

  const sortedArtifacts = [...artifacts].sort(
    (a, b) => b.publishedAt.getTime() - a.publishedAt.getTime()
  );

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
      key: 'published',
      label: 'Published',
      width: '15%',
      render: (item: Artifact) => (
        <span className={styles.date}>{formatDate(item.publishedAt)}</span>
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
        <h1>{topic.name}</h1>
        <p className={styles.subtitle}>{topic.artifactCount} tracked items</p>
      </div>

      <div className={styles.grid}>
        <div className={styles.section}>
          <Panel title="Timeline">
            <Table
              columns={columns}
              data={sortedArtifacts}
              keyExtractor={(item) => item.id}
            />
          </Panel>
        </div>

        <div className={styles.section}>
          <Panel title="Trust Distribution">
            <div className={styles.stats}>
              <Row>
                <div className={styles.statRow}>
                  <span className={styles.statLabel}>High trust</span>
                  <span className={styles.statValue}>
                    {artifacts.filter((a) => a.trustLevel === 'high').length}
                  </span>
                </div>
              </Row>
              <Row>
                <div className={styles.statRow}>
                  <span className={styles.statLabel}>Medium trust</span>
                  <span className={styles.statValue}>
                    {artifacts.filter((a) => a.trustLevel === 'medium').length}
                  </span>
                </div>
              </Row>
              <Row>
                <div className={styles.statRow}>
                  <span className={styles.statLabel}>Low trust</span>
                  <span className={styles.statValue}>
                    {artifacts.filter((a) => a.trustLevel === 'low').length}
                  </span>
                </div>
              </Row>
            </div>
          </Panel>
        </div>
      </div>
    </Layout>
  );
}
