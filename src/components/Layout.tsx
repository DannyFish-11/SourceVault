import React from 'react';
import Link from 'next/link';
import styles from './Layout.module.css';

interface LayoutProps {
  children: React.ReactNode;
}

export function Layout({ children }: LayoutProps) {
  return (
    <div className={styles.container}>
      <nav className={styles.nav}>
        <div className={styles.navContent}>
          <Link href="/" className={styles.logo}>
            SourceVault
          </Link>
          <div className={styles.navLinks}>
            <Link href="/">Dashboard</Link>
            <Link href="/search">Search</Link>
            <Link href="/vault">Vault</Link>
            <Link href="/inbox">Inbox</Link>
            <Link href="/inspection">Inspection</Link>
            <Link href="/settings">Settings</Link>
          </div>
        </div>
      </nav>
      <main className={styles.main}>{children}</main>
    </div>
  );
}
