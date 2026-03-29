#!/usr/bin/env tsx

/**
 * Failure Scenario Testing
 *
 * Tests how the system handles various failure conditions:
 * - Missing USB vault
 * - Invalid credentials
 * - Unavailable targets
 * - Transient delivery failures
 */

import { existsSync, mkdirSync, rmSync } from 'fs';
import { join } from 'path';
import { v4 as uuidv4 } from 'uuid';
import { SQLiteAdapter } from '../src/runtime/storage';
import { SettingsLoader } from '../src/runtime/settings';
import { CredentialManager } from '../src/runtime/credentials';
import { PushPolicyEngine, EvaluationContext } from '../src/runtime/policy';
import { TargetRegistry } from '../src/runtime/registry';
import { RetryPolicy } from '../src/runtime/retry';
import { DeliveryHarness } from '../src/runtime/delivery/harness';
import { USBVaultAdapter } from '../src/runtime/delivery/adapters/usb';

const TEST_DIR = join(process.cwd(), '.sourcevault-test-failures');

interface FailureTestResult {
  scenario: string;
  expectedBehavior: string;
  actualBehavior: string;
  passed: boolean;
  details?: string;
}

async function runFailureTests() {
  console.log('=== SourceVault Failure Scenario Tests ===\n');

  const results: FailureTestResult[] = [];

  // Setup
  if (existsSync(TEST_DIR)) {
    rmSync(TEST_DIR, { recursive: true });
  }
  mkdirSync(TEST_DIR, { recursive: true });

  const storage = new SQLiteAdapter();
  const settingsLoader = new SettingsLoader();
  const credentialManager = new CredentialManager(storage);
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

  // Create test artifact
  const testArtifact = await createTestArtifact(storage);

  // Test 1: Missing USB vault
  console.log('1. Testing missing USB vault...');
  results.push(await testMissingUSB(deliveryHarness, testArtifact));

  // Test 2: Invalid credentials
  console.log('\n2. Testing invalid credentials...');
  results.push(await testInvalidCredentials(credentialManager));

  // Test 3: Unavailable target
  console.log('\n3. Testing unavailable target...');
  results.push(await testUnavailableTarget(targetRegistry));

  // Test 4: Transient delivery failure
  console.log('\n4. Testing transient delivery failure...');
  results.push(await testTransientFailure(storage, retryPolicy));

  // Test 5: Configuration error
  console.log('\n5. Testing configuration error...');
  results.push(await testConfigurationError(deliveryHarness, testArtifact));

  // Test 6: Retry exhaustion
  console.log('\n6. Testing retry exhaustion...');
  results.push(await testRetryExhaustion(retryPolicy));

  // Summary
  console.log('\n=== Test Summary ===\n');
  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;

  console.log(`Total: ${results.length} | Passed: ${passed} | Failed: ${failed}\n`);

  for (const result of results) {
    const status = result.passed ? '✓' : '✗';
    console.log(`${status} ${result.scenario}`);
    console.log(`  Expected: ${result.expectedBehavior}`);
    console.log(`  Actual: ${result.actualBehavior}`);
    if (result.details) {
      console.log(`  Details: ${result.details}`);
    }
    console.log();
  }

  // Cleanup
  storage.close();
  if (existsSync(TEST_DIR)) {
    rmSync(TEST_DIR, { recursive: true });
  }

  console.log('=== Tests Complete ===');
}

async function createTestArtifact(storage: SQLiteAdapter): Promise<any> {
  const sourceId = uuidv4();
  const artifactId = uuidv4();

  storage.createSource({
    id: sourceId,
    type: 'github',
    url: 'https://github.com/test/repo',
    name: 'Test Repo',
    trustLevel: 'high',
    lastChecked: new Date(),
  });

  storage.createArtifact({
    id: artifactId,
    sourceId,
    title: 'Test Artifact',
    summary: 'Test artifact for failure scenarios',
    url: 'https://github.com/test/repo',
    publishedAt: new Date(),
    discoveredAt: new Date(),
    trustLevel: 'high',
    status: 'new',
    topicIds: [],
  });

  return storage.getArtifact(artifactId);
}

async function testMissingUSB(
  harness: DeliveryHarness,
  artifact: any
): Promise<FailureTestResult> {
  const result: FailureTestResult = {
    scenario: 'Missing USB vault',
    expectedBehavior: 'Job should be deferred with clear error message',
    actualBehavior: '',
    passed: false,
  };

  try {
    const context: EvaluationContext = {
      itemId: artifact.id,
      itemType: 'artifact',
      trustScore: 0.8,
      sourceType: 'github',
      sourceDomain: 'github.com',
      admissionDecision: 'admit',
    };

    const job = await harness.createDeliveryJob(
      artifact.id,
      'artifact',
      'usb',
      context
    );

    if (job && job.status === 'deferred') {
      result.actualBehavior = `Job deferred: ${job.lastError || 'no error message'}`;
      result.passed = true;
      console.log(`  ✓ Job correctly deferred`);
      console.log(`  Error message: ${job.lastError}`);
    } else {
      result.actualBehavior = `Job status: ${job?.status || 'null'}`;
      console.log(`  ✗ Unexpected job status: ${job?.status}`);
    }
  } catch (error) {
    result.actualBehavior = `Exception: ${error instanceof Error ? error.message : 'unknown'}`;
    result.details = String(error);
    console.log(`  ✗ Unexpected exception: ${result.actualBehavior}`);
  }

  return result;
}

async function testInvalidCredentials(
  credentialManager: CredentialManager
): Promise<FailureTestResult> {
  const result: FailureTestResult = {
    scenario: 'Invalid credentials',
    expectedBehavior: 'Verification should fail with invalid status',
    actualBehavior: '',
    passed: false,
  };

  try {
    const credential = await credentialManager.createCredential({
      target: 'perplexity',
      authType: 'api_key',
      label: 'Invalid Test Key',
      value: 'invalid-key-12345',
    });

    const isValid = await credentialManager.verifyCredential(credential.id);

    if (!isValid) {
      const updated = await credentialManager.getCredential(credential.id);
      result.actualBehavior = `Verification failed, status: ${updated?.status}`;
      result.passed = updated?.status === 'invalid';
      console.log(`  ${result.passed ? '✓' : '✗'} Credential marked as invalid`);
    } else {
      result.actualBehavior = 'Verification unexpectedly succeeded';
      console.log(`  ✗ Invalid credential passed verification`);
    }

    await credentialManager.deleteCredential(credential.id);
  } catch (error) {
    result.actualBehavior = `Exception: ${error instanceof Error ? error.message : 'unknown'}`;
    result.details = String(error);
    console.log(`  ✗ Unexpected exception: ${result.actualBehavior}`);
  }

  return result;
}

async function testUnavailableTarget(
  targetRegistry: TargetRegistry
): Promise<FailureTestResult> {
  const result: FailureTestResult = {
    scenario: 'Unavailable target',
    expectedBehavior: 'Target should be marked unavailable with error',
    actualBehavior: '',
    passed: false,
  };

  try {
    const nonExistentPath = join(TEST_DIR, 'non-existent-usb');
    const adapter = new USBVaultAdapter(nonExistentPath);

    const isConfigured = await adapter.isConfigured();
    const isAvailable = await adapter.isAvailable();

    if (isConfigured && !isAvailable) {
      result.actualBehavior = 'Target configured but unavailable';
      result.passed = true;
      console.log(`  ✓ Target correctly marked unavailable`);
    } else {
      result.actualBehavior = `Configured: ${isConfigured}, Available: ${isAvailable}`;
      console.log(`  ✗ Unexpected availability state`);
    }
  } catch (error) {
    result.actualBehavior = `Exception: ${error instanceof Error ? error.message : 'unknown'}`;
    result.details = String(error);
    console.log(`  ✗ Unexpected exception: ${result.actualBehavior}`);
  }

  return result;
}

async function testTransientFailure(
  storage: SQLiteAdapter,
  retryPolicy: RetryPolicy
): Promise<FailureTestResult> {
  const result: FailureTestResult = {
    scenario: 'Transient delivery failure',
    expectedBehavior: 'Should classify as transient and schedule retry',
    actualBehavior: '',
    passed: false,
  };

  try {
    const error = new Error('Network timeout');
    const strategy = retryPolicy.getStrategy('delivery');
    const retryState = retryPolicy.createRetryState('test-job-001', error, strategy, 0);

    const category = retryState.failureCategory;
    const shouldRetry = retryPolicy.shouldRetry(retryState, strategy);

    if (category === 'transient' && shouldRetry && retryState.nextAttemptAt) {
      result.actualBehavior = `Classified as transient, retry scheduled for ${retryState.nextAttemptAt.toISOString()}`;
      result.passed = true;
      console.log(`  ✓ Correctly classified as transient`);
      console.log(`  Next retry: ${retryState.nextAttemptAt.toISOString()}`);
    } else {
      result.actualBehavior = `Category: ${category}, ShouldRetry: ${shouldRetry}`;
      console.log(`  ✗ Incorrect classification or retry decision`);
    }
  } catch (error) {
    result.actualBehavior = `Exception: ${error instanceof Error ? error.message : 'unknown'}`;
    result.details = String(error);
    console.log(`  ✗ Unexpected exception: ${result.actualBehavior}`);
  }

  return result;
}

async function testConfigurationError(
  harness: DeliveryHarness,
  artifact: any
): Promise<FailureTestResult> {
  const result: FailureTestResult = {
    scenario: 'Configuration error',
    expectedBehavior: 'Should not retry automatically, mark as deferred',
    actualBehavior: '',
    passed: false,
  };

  try {
    // Notion without credentials should fail with configuration error
    const context: EvaluationContext = {
      itemId: artifact.id,
      itemType: 'artifact',
      trustScore: 0.8,
      sourceType: 'github',
      sourceDomain: 'github.com',
      admissionDecision: 'admit',
    };

    const job = await harness.createDeliveryJob(
      artifact.id,
      'artifact',
      'notion',
      context
    );

    if (job && (job.status === 'deferred' || job.status === 'blocked')) {
      result.actualBehavior = `Job ${job.status}: ${job.lastError || 'no error'}`;
      result.passed = true;
      console.log(`  ✓ Configuration error handled correctly`);
    } else {
      result.actualBehavior = `Job status: ${job?.status || 'null'}`;
      console.log(`  ✗ Unexpected status for configuration error`);
    }
  } catch (error) {
    result.actualBehavior = `Exception: ${error instanceof Error ? error.message : 'unknown'}`;
    result.details = String(error);
    console.log(`  ✗ Unexpected exception: ${result.actualBehavior}`);
  }

  return result;
}

async function testRetryExhaustion(
  retryPolicy: RetryPolicy
): Promise<FailureTestResult> {
  const result: FailureTestResult = {
    scenario: 'Retry exhaustion',
    expectedBehavior: 'Should stop retrying after max attempts',
    actualBehavior: '',
    passed: false,
  };

  try {
    const error = new Error('Persistent failure');
    const strategy = retryPolicy.getStrategy('delivery');

    let retryState = retryPolicy.createRetryState('test-job-002', error, strategy, 0);

    // Simulate multiple failures
    for (let i = 1; i < strategy.maxAttempts; i++) {
      retryState = retryPolicy.createRetryState('test-job-002', error, strategy, i);
    }

    const shouldRetry = retryPolicy.shouldRetry(retryState, strategy);

    if (!shouldRetry && retryState.attempts >= strategy.maxAttempts) {
      result.actualBehavior = `Stopped retrying after ${retryState.attempts} attempts`;
      result.passed = true;
      console.log(`  ✓ Correctly stopped after ${retryState.attempts} attempts`);
    } else {
      result.actualBehavior = `ShouldRetry: ${shouldRetry}, Attempts: ${retryState.attempts}/${strategy.maxAttempts}`;
      console.log(`  ✗ Did not stop retrying as expected`);
    }
  } catch (error) {
    result.actualBehavior = `Exception: ${error instanceof Error ? error.message : 'unknown'}`;
    result.details = String(error);
    console.log(`  ✗ Unexpected exception: ${result.actualBehavior}`);
  }

  return result;
}

// Run failure tests
runFailureTests().catch(console.error);
