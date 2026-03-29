import React from 'react';
import styles from './SourceBadge.module.css';
import { SourceType } from '@/lib/types';

interface SourceBadgeProps {
  type: SourceType;
}

const sourceLabels: Record<SourceType, string> = {
  [SourceType.OFFICIAL_SITE]: 'Official',
  [SourceType.GITHUB_REPO]: 'GitHub',
  [SourceType.GITHUB_RELEASE]: 'Release',
  [SourceType.GITHUB_DOCS]: 'Docs',
  [SourceType.ARXIV]: 'arXiv',
  [SourceType.CROSSREF]: 'Crossref',
  [SourceType.BLOG]: 'Blog',
  [SourceType.FORUM]: 'Forum',
  [SourceType.MEDIA]: 'Media',
};

export function SourceBadge({ type }: SourceBadgeProps) {
  return (
    <span className={styles.badge}>
      {sourceLabels[type]}
    </span>
  );
}
