'use client';

import React, { useState } from 'react';
import { Layout } from '@/components/Layout';
import { Panel } from '@/components/Panel';
import { Table } from '@/components/Table';
import { Tag } from '@/components/Tag';
import { Button } from '@/components/Button';
import { mockArtifacts } from '@/lib/mockData';
import { Artifact, TrustLevel, SourceType } from '@/lib/types';
import styles from './page.module.css';

export default function Search() {
  const [query, setQuery] = useState('');
  const [trustFilter, setTrustFilter] = useState<TrustLevel | 'all'>('all');
  const [results, setResults] = useState<Artifact[]>(mockArtifacts);

  const handleSearch = () => {
    let filtered = mockArtifacts;

    if (query) {
      filtered = filtered.filter(
        (a) =>
          a.title.toLowerCase().includes(query.toLowerCase()) ||
          a.summary.toLowerCase().includes(query.toLowerCase())
      );
    }

    if (trustFilter !== 'all') {
      filtered = filtered.filter((a) => a.trustLevel === trustFilter);
    }

    setResults(filtered);
  };

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
      width: '35%',
      render: (item: Artifact) => (
        <div>
          <a href={`/artifact/${item.id}`} className={styles.titleLink}>
            {item.title}
          </a>
          <p className={styles.summary}>{item.summary}</p>
        </div>
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
      width: '20%',
      render: (item: Artifact) => (
        <a href={item.url} target="_blank" rel="noopener noreferrer" className={styles.sourceLink}>
          View source →
        </a>
      ),
    },
    {
      key: 'actions',
      label: '',
      width: '10%',
      render: (item: Artifact) => (
        <Button size="sm" variant="ghost">
          Save
        </Button>
      ),
    },
  ];

  return (
    <Layout>
      <div className={styles.header}>
        <h1>Search</h1>
        <p className={styles.subtitle}>Find primary sources and research materials</p>
      </div>

      <Panel>
        <div className={styles.searchForm}>
          <input
            type="text"
            placeholder="Search by title or content..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            className={styles.searchInput}
          />
          <div className={styles.filters}>
            <label className={styles.filterLabel}>Trust level:</label>
            <select
              value={trustFilter}
              onChange={(e) => setTrustFilter(e.target.value as TrustLevel | 'all')}
              className={styles.select}
            >
              <option value="all">All</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>
          <Button onClick={handleSearch} variant="primary">
            Search
          </Button>
        </div>
      </Panel>

      <div className={styles.results}>
        <div className={styles.resultsHeader}>
          <span className={styles.count}>{results.length} results</span>
        </div>
        <Panel>
          <Table columns={columns} data={results} keyExtractor={(item) => item.id} />
        </Panel>
      </div>
    </Layout>
  );
}
