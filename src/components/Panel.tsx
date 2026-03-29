import React from 'react';
import styles from './Panel.module.css';

interface PanelProps {
  children: React.ReactNode;
  title?: string;
  className?: string;
}

export function Panel({ children, title, className }: PanelProps) {
  return (
    <div className={`${styles.panel} ${className || ''}`}>
      {title && <div className={styles.title}>{title}</div>}
      <div className={styles.content}>{children}</div>
    </div>
  );
}
