import React from 'react';
import styles from './Tag.module.css';
import { TrustLevel } from '@/lib/types';

interface TagProps {
  children: React.ReactNode;
  variant?: 'default' | 'trust';
  trustLevel?: TrustLevel;
}

export function Tag({ children, variant = 'default', trustLevel }: TagProps) {
  const className = variant === 'trust' && trustLevel
    ? `${styles.tag} ${styles[trustLevel]}`
    : styles.tag;

  return <span className={className}>{children}</span>;
}
