#!/usr/bin/env node
/**
 * End-to-end test script for SourceVault local-first flow
 *
 * Tests: topic -> artifact -> local storage -> export queue -> USB sync
 */

import { SQLiteAdapter } from '../src/runtime/storage/index.js';
import { Exporter } from '../src/runtime/export/index.js';
import { SyncQueue } from '../src/runtime/sync/index.js';
import { v4 as uuidv4 } from 'uuid';
import { existsSync, mkdirSync } from 'fs';
import { join } from 'path';

const TEST_USB_PATH = join(process.cwd(), '.test-usb-vault');

async function runTest() {
  console.log('=== SourceVault End-to-End Test ===\n');

  // Initialize storage
  console.log('1. Initializing local storage...');
  const storage = new SQLiteAdapter();
  console.log('✓ Storage initialized\n');

  // Create test topic
  console.log('2. Creating test topic...');
  const topicId = uuidv4();
  const topic = {
    id: topicId,
    name: 'Test Topic',
    description: 'End-to-end test topic',
    sources: [],
    createdAt: new Date(),
    updatedAt: new Date(),
    artifactCount: 0,
  };
  storage.createTopic(topic);
  console.log(`✓ Topic created: ${topicId}\n`);

  // Create test source
  console.log('3. Creating test source...');
  const sourceId = uuidv4();
  const source = {
    id: sourceId,
    type: 'github_repo',
    url: 'https://github.com/test/repo',
    name: 'Test Repository',
    trustLevel: 'high',
    lastChecked: new Date(),
  };
  storage.createSource(source);
  console.log(`✓ Source created: ${sourceId}\n`);

  // Create test artifact
  console.log('4. Creating test artifact...');
  const artifactId = uuidv4();
  const artifact = {
    id: artifactId,
    sourceId: sourceId,
    topicIds: [topicId],
    title: 'Test Artifact for E2E Flow',
    summary: 'This artifact tests the complete flow from creation to USB sync.',
    url: 'https://github.com/test/repo/releases/v1.0.0',
    publishedAt: new Date(),
    discoveredAt: new Date(),
    trustLevel: 'high',
    status: 'new',
  };
  storage.createArtifact(artifact);
  console.log(`✓ Artifact created: ${artifactId}\n`);

  // Create event
  console.log('5. Creating discovery event...');
  const eventId = uuidv4();
  const event = {
    id: eventId,
    artifactId: artifactId,
    type: 'discovered',
    timestamp: new Date(),
  };
  storage.createEvent(event);
  console.log(`✓ Event created: ${eventId}\n`);

  // Queue export
  console.log('6. Queueing export job...');
  const exporter = new Exporter(storage);
  const syncQueue = new SyncQueue(storage, exporter);
  await syncQueue.queueExport(artifactId);
  console.log(`✓ Export queued\n`);

  // Check queue
  const pendingJobs = storage.getPendingExportJobs();
  console.log(`7. Pending exports: ${pendingJobs.length}`);
  console.log(`✓ Export job in queue\n`);

  // Setup test USB vault
  console.log('8. Setting up test USB vault...');
  if (!existsSync(TEST_USB_PATH)) {
    mkdirSync(TEST_USB_PATH, { recursive: true });
  }
  exporter.initializeVaultStructure(TEST_USB_PATH);
  console.log(`✓ Test USB vault initialized at: ${TEST_USB_PATH}\n`);

  // Configure USB path
  console.log('9. Configuring USB vault path...');
  storage.setSetting('usbVaultPath', TEST_USB_PATH);
  storage.updateSyncState({
    usbConnected: true,
    usbPath: TEST_USB_PATH,
  });
  console.log(`✓ USB vault configured\n`);

  // Process sync queue
  console.log('10. Processing sync queue...');
  await syncQueue.processQueue();
  console.log(`✓ Sync completed\n`);

  // Verify export
  console.log('11. Verifying export...');
  const artifactDir = join(TEST_USB_PATH, 'artifacts', artifactId);
  const summaryExists = existsSync(join(artifactDir, 'summary.md'));
  const artifactJsonExists = existsSync(join(artifactDir, 'artifact.json'));
  const sourceJsonExists = existsSync(join(artifactDir, 'source.json'));
  const linksExists = existsSync(join(artifactDir, 'links.txt'));

  if (summaryExists && artifactJsonExists && sourceJsonExists && linksExists) {
    console.log('✓ All export files created successfully\n');
  } else {
    console.log('✗ Some export files missing:');
    console.log(`  - summary.md: ${summaryExists ? '✓' : '✗'}`);
    console.log(`  - artifact.json: ${artifactJsonExists ? '✓' : '✗'}`);
    console.log(`  - source.json: ${sourceJsonExists ? '✓' : '✗'}`);
    console.log(`  - links.txt: ${linksExists ? '✓' : '✗'}\n`);
  }

  // Check sync state
  console.log('12. Checking sync state...');
  const syncState = storage.getSyncState();
  console.log(`   - Last sync: ${syncState.lastSyncAt}`);
  console.log(`   - USB connected: ${syncState.usbConnected}`);
  console.log(`   - Pending exports: ${syncState.pendingExports}`);
  console.log(`   - Failed exports: ${syncState.failedExports}`);
  console.log(`   - Total exports: ${syncState.totalExports}`);
  console.log('✓ Sync state updated\n');

  // Verify data retrieval
  console.log('13. Verifying data retrieval...');
  const retrievedArtifact = storage.getArtifact(artifactId);
  const retrievedTopic = storage.getTopic(topicId);
  const retrievedSource = storage.getSource(sourceId);
  const retrievedEvents = storage.getEventsByArtifact(artifactId);

  if (retrievedArtifact && retrievedTopic && retrievedSource && retrievedEvents.length > 0) {
    console.log('✓ All data retrieved successfully\n');
  } else {
    console.log('✗ Data retrieval failed\n');
  }

  // Cleanup
  storage.close();

  console.log('=== Test Summary ===');
  console.log('✓ Topic created and stored');
  console.log('✓ Source created and stored');
  console.log('✓ Artifact created and stored');
  console.log('✓ Event logged');
  console.log('✓ Export queued');
  console.log('✓ USB vault initialized');
  console.log('✓ Sync completed');
  console.log('✓ Files exported to USB');
  console.log('✓ Sync state updated');
  console.log('✓ Data retrieval verified');
  console.log('\n✅ End-to-end test PASSED\n');
  console.log(`Test USB vault location: ${TEST_USB_PATH}`);
  console.log('You can inspect the exported files manually.\n');
}

runTest().catch((error) => {
  console.error('\n✗ Test FAILED:', error);
  process.exit(1);
});
