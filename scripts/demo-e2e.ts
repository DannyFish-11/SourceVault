#!/usr/bin/env tsx

/**
 * End-to-End Demo Flow
 *
 * This script demonstrates the complete SourceVault pipeline:
 * 1. Search for a topic using Perplexity
 * 2. Normalize search results
 * 3. Apply trust scoring
 * 4. Vault admission evaluation
 * 5. Delivery harness processing
 * 6. Multi-target delivery
 */

import { v4 as uuidv4 } from 'uuid';
import { SQLiteAdapter } from '../src/runtime/storage';
import { SettingsLoader } from '../src/runtime/settings';
import { CredentialManager } from '../src/runtime/credentials';
import { VaultAdmissionEngine, AdmissionCandidate } from '../src/runtime/admission';
import { SearchOrchestrator, SearchPlan } from '../src/runtime/search';
import { PerplexityConnector } from '../src/runtime/connectors/perplexity';
import { PushPolicyEngine, EvaluationContext } from '../src/runtime/policy';
import { TargetRegistry } from '../src/runtime/registry';
import { RetryPolicy } from '../src/runtime/retry';
import { DeliveryHarness } from '../src/runtime/delivery/harness';

async function runEndToEndDemo() {
  console.log('=== SourceVault End-to-End Demo ===\n');

  // Initialize core components
  console.log('1. Initializing components...');
  const storage = new SQLiteAdapter();
  const settingsLoader = new SettingsLoader();
  const settings = settingsLoader.load();

  const credentialManager = new CredentialManager(storage);
  const admissionEngine = new VaultAdmissionEngine(
    storage,
    settings.policy.sourcePolicy,
    settings.policy.trustThresholdForVault
  );
  const searchOrchestrator = new SearchOrchestrator(storage, admissionEngine);
  const policyEngine = new PushPolicyEngine(storage);
  const targetRegistry = new TargetRegistry(settingsLoader, credentialManager);
  const retryPolicy = new RetryPolicy();
  const deliveryHarness = new DeliveryHarness(
    storage,
    policyEngine,
    targetRegistry,
    retryPolicy
  );

  await targetRegistry.initialize();
  console.log('✓ Components initialized\n');

  // Step 1: Search
  console.log('2. Searching for topic: "React 19 features"...');

  // Check if Perplexity is configured
  const perplexityApiKey = settingsLoader.resolveSecret(
    settings.connectors.perplexity.apiKeyRef || 'PERPLEXITY_API_KEY'
  );

  if (!perplexityApiKey) {
    console.log('⚠ Perplexity API key not found. Using mock search results.');
    await createMockSearchResults(storage, searchOrchestrator);
  } else {
    console.log('✓ Perplexity API key found. Running real search...');
    const connector = new PerplexityConnector(perplexityApiKey);
    searchOrchestrator.registerConnector(connector);

    const searchPlan = await searchOrchestrator.createSearchPlan(
      'React 19 new features and improvements',
      undefined,
      ['direct', 'primary'],
      ['perplexity'],
      'high'
    );

    const batch = await searchOrchestrator.executeSearch(searchPlan);
    console.log(`✓ Found ${batch.candidates.length} candidates\n`);

    // Step 2: Process batch (normalization, trust scoring, admission)
    console.log('3. Processing candidates...');
    await searchOrchestrator.processBatch(batch);
    console.log('✓ Candidates processed\n');
  }

  // Step 3: Check admission results
  console.log('4. Checking vault admission results...');
  const admitted = storage.getAdmissionDecisionsByDecision('admit');
  const review = storage.getAdmissionDecisionsByDecision('review');
  const rejected = storage.getAdmissionDecisionsByDecision('reject');

  console.log(`  Admitted: ${admitted.length}`);
  console.log(`  Review: ${review.length}`);
  console.log(`  Rejected: ${rejected.length}\n`);

  if (admitted.length === 0) {
    console.log('⚠ No items admitted. Creating test artifact...');
    await createTestArtifact(storage);
  }

  // Step 4: Create delivery jobs
  console.log('5. Creating delivery jobs...');
  const artifacts = storage.getArtifactsByStatus('new');

  if (artifacts.length === 0) {
    console.log('⚠ No artifacts found. Creating test artifact...');
    await createTestArtifact(storage);
  }

  const testArtifact = artifacts[0] || storage.getArtifactsByStatus('new')[0];

  if (!testArtifact) {
    console.log('✗ Failed to create test artifact');
    storage.close();
    return;
  }

  const context: EvaluationContext = {
    itemId: testArtifact.id,
    itemType: 'artifact',
    trustScore: 0.8,
    sourceType: 'github',
    sourceDomain: 'github.com',
    admissionDecision: 'admit',
  };

  // Create jobs for all enabled targets
  const enabledTargets = targetRegistry.getEnabledTargets();
  console.log(`  Creating jobs for ${enabledTargets.length} targets...`);

  for (const target of enabledTargets) {
    const job = await deliveryHarness.createDeliveryJob(
      testArtifact.id,
      'artifact',
      target,
      context
    );

    if (job) {
      console.log(`  ✓ Created ${job.status} job for ${target}`);
    }
  }
  console.log();

  // Step 5: Process delivery queue
  console.log('6. Processing delivery queue...');
  await deliveryHarness.processQueue();

  const stats = await deliveryHarness.getJobStats();
  console.log('  Delivery stats:');
  console.log(`    Pending: ${stats.pending}`);
  console.log(`    Ready: ${stats.ready}`);
  console.log(`    Writing: ${stats.writing}`);
  console.log(`    Synced: ${stats.synced}`);
  console.log(`    Failed: ${stats.failed}`);
  console.log(`    Blocked: ${stats.blocked}`);
  console.log(`    Deferred: ${stats.deferred}\n`);

  // Step 6: Target health check
  console.log('7. Target health summary:');
  const health = targetRegistry.getHealthSummary();
  console.log(`  Total targets: ${health.total}`);
  console.log(`  Enabled: ${health.enabled}`);
  console.log(`  Configured: ${health.configured}`);
  console.log(`  Available: ${health.available}`);
  console.log(`  Unavailable: ${health.unavailable}\n`);

  // Show target details
  console.log('8. Target details:');
  const entries = targetRegistry.getAllEntries();
  for (const entry of entries) {
    const status = entry.available ? '✓' : entry.configured ? '⚠' : '✗';
    console.log(`  ${status} ${entry.target}: ${entry.enabled ? 'enabled' : 'disabled'} | ${entry.configured ? 'configured' : 'not configured'} | ${entry.available ? 'available' : 'unavailable'}`);
    if (entry.lastError) {
      console.log(`      Error: ${entry.lastError}`);
    }
  }

  storage.close();
  console.log('\n=== Demo Complete ===');
}

async function createMockSearchResults(
  storage: SQLiteAdapter,
  orchestrator: SearchOrchestrator
) {
  // Create mock search plan
  const plan: SearchPlan = {
    id: uuidv4(),
    baseQuery: 'React 19 features',
    layers: ['direct'],
    connectors: ['perplexity'],
    priority: 'high',
    candidateCount: 0,
    createdAt: new Date(),
  };

  storage.createSearchPlan(plan);

  // Create mock candidates
  const candidates = [
    {
      id: uuidv4(),
      title: 'React 19 Release Notes',
      url: 'https://react.dev/blog/2024/react-19',
      summary: 'Official React 19 release notes with new features',
      sourceType: 'official_docs',
      sourceDomain: 'react.dev',
      connector: 'perplexity' as const,
      layer: 'direct' as const,
      publishedAt: new Date(),
    },
    {
      id: uuidv4(),
      title: 'React 19 GitHub Release',
      url: 'https://github.com/facebook/react/releases/tag/v19.0.0',
      summary: 'React 19.0.0 release on GitHub',
      sourceType: 'github',
      sourceDomain: 'github.com',
      connector: 'perplexity' as const,
      layer: 'direct' as const,
      publishedAt: new Date(),
    },
  ];

  const batch = {
    planId: plan.id,
    baseQuery: plan.baseQuery,
    executedAt: new Date(),
    candidates,
    connectorStats: { github: 0, arxiv: 0, perplexity: 2 },
  };

  await orchestrator.processBatch(batch);
}

async function createTestArtifact(storage: SQLiteAdapter) {
  const sourceId = uuidv4();
  const artifactId = uuidv4();

  storage.createSource({
    id: sourceId,
    type: 'github',
    url: 'https://github.com/facebook/react',
    name: 'React',
    trustLevel: 'high',
    lastChecked: new Date(),
  });

  storage.createArtifact({
    id: artifactId,
    sourceId,
    title: 'React 19 Release',
    summary: 'React 19 introduces new features including Actions, use API, and improved performance.',
    url: 'https://github.com/facebook/react/releases/tag/v19.0.0',
    publishedAt: new Date(),
    discoveredAt: new Date(),
    trustLevel: 'high',
    status: 'new',
    topicIds: [],
  });

  console.log(`✓ Created test artifact: ${artifactId}`);
}

// Run the demo
runEndToEndDemo().catch(console.error);
