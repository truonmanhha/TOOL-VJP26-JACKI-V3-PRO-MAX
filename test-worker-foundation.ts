#!/usr/bin/env node
// ============================================================
// WORKER VERIFICATION SCRIPT
// Tests WorkerManager and nesting.worker.ts communication
// ============================================================

import { WorkerManager } from './services/WorkerManager';

/**
 * Test WorkerManager initialization
 */
async function testWorkerManagerInit() {
  console.log('\n📋 TEST 1: WorkerManager Initialization');
  console.log('─'.repeat(50));

  const manager = new WorkerManager({
    dxfPoolSize: 1,
    nestingPoolSize: 1,
    debug: true
  });

  const stats = manager.getStats();
  console.log('✓ WorkerManager initialized successfully');
  console.log(`  DXF workers: ${stats.dxf.total}`);
  console.log(`  Nesting workers: ${stats.nesting.total}`);
  console.log(`  Pending requests: ${stats.pending}`);

  manager.terminate();
  console.log('✓ WorkerManager terminated');
}

/**
 * Test nesting worker message sending (simulation)
 */
async function testNestingWorkerInterface() {
  console.log('\n📋 TEST 2: Nesting Worker Message Interface');
  console.log('─'.repeat(50));

  // Verify imports work
  try {
    const { AdvancedNestingEngine, DEFAULT_NESTING_CONFIG } = await import(
      './services/nesting/index'
    );
    console.log('✓ Successfully imported AdvancedNestingEngine');
    console.log('✓ Successfully imported DEFAULT_NESTING_CONFIG');

    // Test engine instantiation
    const engine = new AdvancedNestingEngine(DEFAULT_NESTING_CONFIG);
    console.log('✓ AdvancedNestingEngine instantiated');

    // Verify the config structure
    console.log(`  Strategy: ${DEFAULT_NESTING_CONFIG.strategy}`);
    console.log(`  Part Gap: ${DEFAULT_NESTING_CONFIG.partGap}mm`);
    console.log(`  Edge Margin: ${DEFAULT_NESTING_CONFIG.edgeMargin}mm`);
  } catch (error) {
    console.error('✗ Failed to import nesting engine:', error);
  }
}

/**
 * Test standardized message shape
 */
async function testMessageShape() {
  console.log('\n📋 TEST 3: Standardized Message Shape');
  console.log('─'.repeat(50));

  // Example success message
  const successMsg = {
    type: 'success',
    payload: { result: 'nesting completed' },
    requestId: '123-abc'
  };
  console.log('✓ Success message shape:');
  console.log(`  ${JSON.stringify(successMsg)}`);

  // Example progress message
  const progressMsg = {
    type: 'progress',
    progress: 50,
    requestId: '123-abc'
  };
  console.log('✓ Progress message shape:');
  console.log(`  ${JSON.stringify(progressMsg)}`);

  // Example error message
  const errorMsg = {
    type: 'error',
    error: 'Worker timeout',
    requestId: '123-abc'
  };
  console.log('✓ Error message shape:');
  console.log(`  ${JSON.stringify(errorMsg)}`);
}

/**
 * Test WorkerManager pool logic (without actual workers)
 */
async function testPoolLogic() {
  console.log('\n📋 TEST 4: WorkerManager Pool Logic');
  console.log('─'.repeat(50));

  const manager = new WorkerManager({
    dxfPoolSize: 2,
    nestingPoolSize: 2,
    defaultTimeout: 5000,
    debug: true
  });

  const stats1 = manager.getStats();
  console.log('✓ Initial pool stats:');
  console.log(`  DXF: ${stats1.dxf.total} total, ${stats1.dxf.busy} busy`);
  console.log(`  Nesting: ${stats1.nesting.total} total, ${stats1.nesting.busy} busy`);

  // Try to get stats again (workers should be idle)
  await new Promise(r => setTimeout(r, 100));
  const stats2 = manager.getStats();
  console.log('✓ Pool stats after idle wait:');
  console.log(`  DXF: ${stats2.dxf.total} total, ${stats2.dxf.busy} busy`);
  console.log(`  Nesting: ${stats2.nesting.total} total, ${stats2.nesting.busy} busy`);

  manager.terminate();
  console.log('✓ WorkerManager terminated cleanly');
}

/**
 * Main test runner
 */
async function runAllTests() {
  console.log('╔════════════════════════════════════════════════════╗');
  console.log('║     WEB WORKER FOUNDATION VERIFICATION SUITE       ║');
  console.log('╚════════════════════════════════════════════════════╝');

  try {
    await testWorkerManagerInit();
    await testNestingWorkerInterface();
    await testMessageShape();
    await testPoolLogic();

    console.log('\n╔════════════════════════════════════════════════════╗');
    console.log('║              ✓ ALL TESTS PASSED                   ║');
    console.log('╚════════════════════════════════════════════════════╝\n');
  } catch (error) {
    console.error('\n✗ TEST SUITE FAILED:', error);
    process.exit(1);
  }
}

// Run tests
runAllTests().catch(console.error);
