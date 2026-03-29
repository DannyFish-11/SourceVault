import React from 'react';
import { Layout } from '@/components/Layout';
import { Panel } from '@/components/Panel';
import { Row } from '@/components/Row';
import { Tag } from '@/components/Tag';
import { mockArtifacts } from '@/lib/mockData';
import styles from './page.module.css';

export default function Inbox() {
  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }).format(date);
  };

  return (
    <Layout>
      <div className={styles.header}>
        <h1>Inbox</h1>
        <p className={styles.subtitle}>Daily digest and source updates</p>
      </div>

      <div className={styles.grid}>
        <div className={styles.section}>
          <Panel title="Today - March 28, 2026">
            <div className={styles.digest}>
              <p className={styles.digestSummary}>
                5 sources updated. 3 new high-trust items.
              </p>

              <div className={styles.digestSection}>
                <h3 className={styles.digestHeading}>Breaking changes</h3>
                <div className={styles.digestEntry}>
                  <p className={styles.digestText}>
                    React 19 RC: Suspense API changes require migration. Official guide published to react.dev.
                  </p>
                  <a href="/artifact/1" className={styles.digestLink}>View artifact →</a>
                </div>
              </div>

              <div className={styles.digestSection}>
                <h3 className={styles.digestHeading}>New research</h3>
                <div className={styles.digestEntry}>
                  <p className={styles.digestText}>
                    Constitutional AI with RLAIF published to arXiv. Introduces reinforcement learning from AI feedback method.
                  </p>
                  <a href="/artifact/2" className={styles.digestLink}>View artifact →</a>
                </div>
              </div>

              <div className={styles.digestSection}>
                <h3 className={styles.digestHeading}>Updates</h3>
                <div className={styles.digestEntry}>
                  <p className={styles.digestText}>
                    Next.js 15 documentation updated with new caching behavior and App Router improvements.
                  </p>
                  <a href="/artifact/3" className={styles.digestLink}>View artifact →</a>
                </div>
              </div>
            </div>
          </Panel>
        </div>

        <div className={styles.section}>
          <Panel title="Yesterday - March 27, 2026">
            <div className={styles.digest}>
              <p className={styles.digestSummary}>
                2 sources updated. 1 new item.
              </p>
              <button className={styles.expandButton}>Expand ↓</button>
            </div>
          </Panel>
        </div>
      </div>
    </Layout>
  );
}
