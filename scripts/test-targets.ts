#!/usr/bin/env tsx

/**
 * Smoke Tests for All Delivery Targets
 *
 * Tests each delivery target adapter to ensure basic functionality
 */

import { existsSync, mkdirSync, writeFileSync, rmSync } from 'fs';
import { join } from 'path';
import { RawVaultAdapter } from '../src/runtime/delivery/adapters/raw';
import { USBVaultAdapter } from '../src/runtime/delivery/adapters/usb';
import { ObsidianAdapter } from '../src/runtime/delivery/adapters/obsidian';
import { NotebookAdapter } from '../src/runtime/delivery/adapters/notebook';
import { NotionAdapter } from '../src/runtime/delivery/adapters/notion';

const TEST_DIR = join(process.cwd(), '.sourcevault-test');

interface TestResult {
  target: string;
  configured: boolean;
  available: boolean;
  eligible: boolean;
  serialized: boolean;
  delivered: boolean;
  error?: string;
}

async function runSmokeTests() {
  console.log('=== SourceVault Target Smoke Tests ===\n');

  const results: TestResult[] = [];

  // Setup test directory
  if (existsSync(TEST_DIR)) {
    rmSync(TEST_DIR, { recursive: true });
  }
  mkdirSync(TEST_DIR, { recursive: true });

  // Test artifact
  const testArtifact = {
    id: 'test-artifact-001',
    sourceId: 'test-source-001',
    title: 'Test Artifact for Smoke Tests',
    summary: 'This is a test artifact used for smoke testing delivery targets.',
    url: 'https://example.com/test',
    publishedAt: new Date(),
    discoveredAt: new Date(),
    trustLevel: 'high',
    status: 'new',
    topicIds: [],
  };

  // Test 1: Raw Vault
  console.log('1. Testing Raw Vault Adapter...');
  results.push(await testRawVault(testArtifact));

  // Test 2: USB Vault
  console.log('\n2. Testing USB Vault Adapter...');
  results.push(await testUSBVault(testArtifact));

  // Test 3: Obsidian
  console.log('\n3. Testing Obsidian Adapter...');
  results.push(await testObsidian(testArtifact));

  // Test 4: Notebook
  console.log('\n4. Testing Notebook Adapter...');
  results.push(await testNotebook(testArtifact));

  // Test 5: Notion
  console.log('\n5. Testing Notion Adapter...');
  results.push(await testNotion(testArtifact));

  // Summary
  console.log('\n=== Test Summary ===\n');
  console.log('Target          | Configured | Available | Eligible | Serialized | Delivered');
  console.log('----------------|------------|-----------|----------|------------|----------');

  for (const result of results) {
    const row = [
      result.target.padEnd(15),
      result.configured ? '✓' : '✗',
      result.available ? '✓' : '✗',
      result.eligible ? '✓' : '✗',
      result.serialized ? '✓' : '✗',
      result.delivered ? '✓' : '✗',
    ].join(' | ');

    console.log(row);

    if (result.error) {
      console.log(`                  Error: ${result.error}`);
    }
  }

  // Cleanup
  console.log('\n=== Cleaning up test directory ===');
  if (existsSync(TEST_DIR)) {
    rmSync(TEST_DIR, { recursive: true });
  }
  console.log('✓ Cleanup complete\n');
}

async function testRawVault(artifact: any): Promise<TestResult> {
  const result: TestResult = {
    target: 'raw',
    configured: false,
    available: false,
    eligible: false,
    serialized: false,
    delivered: false,
  };

  try {
    const vaultPath = join(TEST_DIR, 'raw-vault');
    mkdirSync(vaultPath, { recursive: true });

    const adapter = new RawVaultAdapter(vaultPath);

    result.configured = await adapter.isConfigured();
    console.log(`  Configured: ${result.configured ? '✓' : '✗'}`);

    result.available = await adapter.isAvailable();
    console.log(`  Available: ${result.available ? '✓' : '✗'}`);

    result.eligible = await adapter.isEligible(artifact);
    console.log(`  Eligible: ${result.eligible ? '✓' : '✗'}`);

    const payload = await adapter.serialize(artifact);
    result.serialized = !!payload;
    console.log(`  Serialized: ${result.serialized ? '✓' : '✗'}`);

    await adapter.deliver(payload);
    result.delivered = existsSync(join(vaultPath, 'artifacts', artifact.id, 'artifact.json'));
    console.log(`  Delivered: ${result.delivered ? '✓' : '✗'}`);
  } catch (error) {
    result.error = error instanceof Error ? error.message : 'Unknown error';
    console.log(`  ✗ Error: ${result.error}`);
  }

  return result;
}

async function testUSBVault(artifact: any): Promise<TestResult> {
  const result: TestResult = {
    target: 'usb',
    configured: false,
    available: false,
    eligible: false,
    serialized: false,
    delivered: false,
  };

  try {
    const usbPath = join(TEST_DIR, 'usb-vault');
    mkdirSync(usbPath, { recursive: true });

    // Create .sourcevault marker
    writeFileSync(join(usbPath, '.sourcevault'), 'SourceVault USB Vault', 'utf-8');

    const adapter = new USBVaultAdapter(usbPath);

    result.configured = await adapter.isConfigured();
    console.log(`  Configured: ${result.configured ? '✓' : '✗'}`);

    result.available = await adapter.isAvailable();
    console.log(`  Available: ${result.available ? '✓' : '✗'}`);

    result.eligible = await adapter.isEligible(artifact);
    console.log(`  Eligible: ${result.eligible ? '✓' : '✗'}`);

    const payload = await adapter.serialize(artifact);
    result.serialized = !!payload;
    console.log(`  Serialized: ${result.serialized ? '✓' : '✗'}`);

    await adapter.deliver(payload);

    const timestamp = new Date().toISOString().split('T')[0];
    result.delivered = existsSync(join(usbPath, 'artifacts', timestamp, artifact.id, 'artifact.json'));
    console.log(`  Delivered: ${result.delivered ? '✓' : '✗'}`);
  } catch (error) {
    result.error = error instanceof Error ? error.message : 'Unknown error';
    console.log(`  ✗ Error: ${result.error}`);
  }

  return result;
}

async function testObsidian(artifact: any): Promise<TestResult> {
  const result: TestResult = {
    target: 'obsidian',
    configured: false,
    available: false,
    eligible: false,
    serialized: false,
    delivered: false,
  };

  try {
    const vaultPath = join(TEST_DIR, 'obsidian-vault');
    mkdirSync(vaultPath, { recursive: true });

    const adapter = new ObsidianAdapter(vaultPath);

    result.configured = await adapter.isConfigured();
    console.log(`  Configured: ${result.configured ? '✓' : '✗'}`);

    result.available = await adapter.isAvailable();
    console.log(`  Available: ${result.available ? '✓' : '✗'}`);

    result.eligible = await adapter.isEligible(artifact);
    console.log(`  Eligible: ${result.eligible ? '✓' : '✗'}`);

    const payload = await adapter.serialize(artifact);
    result.serialized = !!payload;
    console.log(`  Serialized: ${result.serialized ? '✓' : '✗'}`);

    await adapter.deliver(payload);
    result.delivered = existsSync(join(vaultPath, 'SourceVault', 'Artifacts'));
    console.log(`  Delivered: ${result.delivered ? '✓' : '✗'}`);
  } catch (error) {
    result.error = error instanceof Error ? error.message : 'Unknown error';
    console.log(`  ✗ Error: ${result.error}`);
  }

  return result;
}

async function testNotebook(artifact: any): Promise<TestResult> {
  const result: TestResult = {
    target: 'notebook',
    configured: false,
    available: false,
    eligible: false,
    serialized: false,
    delivered: false,
  };

  try {
    const workspacePath = join(TEST_DIR, 'notebook-workspace');
    mkdirSync(workspacePath, { recursive: true });

    const adapter = new NotebookAdapter('http://localhost:3001', 'test-key');

    result.configured = await adapter.isConfigured();
    console.log(`  Configured: ${result.configured ? '✓' : '✗'}`);

    result.available = await adapter.isAvailable();
    console.log(`  Available: ${result.available ? '✗ (expected - no server running)'}`);

    result.eligible = await adapter.isEligible(artifact);
    console.log(`  Eligible: ${result.eligible ? '✓' : '✗'}`);

    const payload = await adapter.serialize(artifact);
    result.serialized = !!payload;
    console.log(`  Serialized: ${result.serialized ? '✓' : '✗'}`);

    console.log(`  Delivered: ✗ (skipped - no server)`);
  } catch (error) {
    result.error = error instanceof Error ? error.message : 'Unknown error';
    console.log(`  ✗ Error: ${result.error}`);
  }

  return result;
}

async function testNotion(artifact: any): Promise<TestResult> {
  const result: TestResult = {
    target: 'notion',
    configured: false,
    available: false,
    eligible: false,
    serialized: false,
    delivered: false,
  };

  try {
    const notionToken = process.env.NOTION_TOKEN || '';
    const databaseId = process.env.NOTION_DATABASE_ID || 'test-database-id';

    const adapter = new NotionAdapter(notionToken, databaseId);

    result.configured = await adapter.isConfigured();
    console.log(`  Configured: ${result.configured ? '✓' : '✗ (no token)'}`);

    if (result.configured) {
      result.available = await adapter.isAvailable();
      console.log(`  Available: ${result.available ? '✓' : '✗'}`);
    } else {
      console.log(`  Available: ✗ (not configured)`);
    }

    result.eligible = await adapter.isEligible(artifact);
    console.log(`  Eligible: ${result.eligible ? '✓' : '✗'}`);

    const payload = await adapter.serialize(artifact);
    result.serialized = !!payload;
    console.log(`  Serialized: ${result.serialized ? '✓' : '✗'}`);

    if (result.configured && result.available) {
      console.log(`  Delivered: ✗ (skipped - would create real Notion page)`);
    } else {
      console.log(`  Delivered: ✗ (skipped - not configured)`);
    }
  } catch (error) {
    result.error = error instanceof Error ? error.message : 'Unknown error';
    console.log(`  ✗ Error: ${result.error}`);
  }

  return result;
}

// Run smoke tests
runSmokeTests().catch(console.error);
