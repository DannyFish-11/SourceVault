import React from 'react';
import styles from './Row.module.css';

interface RowProps {
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
}

export function Row({ children, onClick, className }: RowProps) {
  const rowClass = `${styles.row} ${onClick ? styles.clickable : ''} ${className || ''}`;

  return (
    <div className={rowClass} onClick={onClick}>
      {children}
    </div>
  );
}
