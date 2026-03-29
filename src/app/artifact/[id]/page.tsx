import React from 'react';
import { Layout } from '@/components/Layout';
import { Panel } from '@/components/Panel';
import { Tag } from '@/components/Tag';
import { Button } from '@/components/Button';
import { Row } from '@/components/Row';
import { mockArtifacts, mockSources, mockTopics } from '@/lib/mockData';
import styles from './page.module.css';

export default function ArtifactDetail({ params }: { params: { id: string } }) {
  const artifact = mockArtifacts.find((a) => a.id === params.id);
  const source = artifact ? mockSources.find((s) => s.id === artifact.sourceId) : null;
  const relatedTopics = artifact ? mockTopics.filter((t) => artifact.topicIds.includes(t.id)) : [];

  if (!artifact) {
    return (
      <Layout>
        <div>Artifact not found</div>
      </Layout>
    );
  }

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  };

  return (
    <Layout>
      <div className={styles.header}>
        <div className={styles.titleRow}>
          <h1>{artifact.title}</h1>
          <div className={styles.actions}>
            <Button variant="secondary" size="sm">
              Save to Vault
            </Button>
            <a
              href={artifact.url}
              target="_blank"
              rel="noopener noreferrer"
              className={styles.sourceButton}
            >
              <Button variant="primary" size="sm">
                View Source →
              </Button>
            </a>
          </div>
        </div>
        <div className={styles.meta}>
          <Tag variant="trust" trustLevel={artifact.trustLevel}>
            {artifact.trustLevel}
          </Tag>
          <Tag>{artifact.status}</Tag>
        </div>
      </div>

      <div className={styles.grid}>
        <div className={styles.mainColumn}>
          <Panel title="Summary">
            <p className={styles.summary}>{artifact.summary}</p>
          </Panel>

          <Panel title="Source Information">
            <div className={styles.infoGrid}>
              <div className={styles.infoRow}>
                <span className={styles.label}>Source</span>
                <span className={styles.value}>{source?.name || 'Unknown'}</span>
              </div>
              <div className={styles.infoRow}>
                <span className={styles.label}>Source Type</span>
                <span className={styles.value}>{source?.type || 'Unknown'}</span>
              </div>
              <div className={styles.infoRow}>
                <span className={styles.label}>URL</span>
                <a
                  href={artifact.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={styles.link}
                >
                  {artifact.url}
                </a>
              </div>
            </div>
          </Panel>
        </div>

        <div className={styles.sidebar}>
          <Panel title="Timeline">
            <div className={styles.timeline}>
              <Row>
                <div className={styles.timelineItem}>
                  <span className={styles.timelineLabel}>Published</span>
                  <span className={styles.timelineDate}>
                    {formatDate(artifact.publishedAt)}
                  </span>
                </div>
              </Row>
              <Row>
                <div className={styles.timelineItem}>
                  <span className={styles.timelineLabel}>Discovered</span>
                  <span className={styles.timelineDate}>
                    {formatDate(artifact.discoveredAt)}
                  </span>
                </div>
              </Row>
              {artifact.updatedAt && (
                <Row>
                  <div className={styles.timelineItem}>
                    <span className={styles.timelineLabel}>Updated</span>
                    <span className={styles.timelineDate}>
                      {formatDate(artifact.updatedAt)}
                    </span>
                  </div>
                </Row>
              )}
            </div>
          </Panel>

          <Panel title="Related Topics">
            <div className={styles.topics}>
              {relatedTopics.map((topic) => (
                <Row key={topic.id}>
                  <a href={`/topic/${topic.id}`} className={styles.topicLink}>
                    {topic.name}
                  </a>
                </Row>
              ))}
            </div>
          </Panel>
        </div>
      </div>
    </Layout>
  );
}
