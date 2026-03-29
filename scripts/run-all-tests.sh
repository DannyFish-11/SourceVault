#!/bin/bash

# SourceVault Test Execution Script
# Runs all validation tests in sequence

set -e

echo "======================================"
echo "SourceVault Validation Test Suite"
echo "======================================"
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if database exists
if [ ! -f ".sourcevault/vault.db" ]; then
    echo -e "${YELLOW}Database not found. Initializing...${NC}"
    npm run vault:init
    echo ""
fi

# Test 1: End-to-End Demo
echo "======================================"
echo "Test 1: End-to-End Pipeline Demo"
echo "======================================"
echo ""

if npm run demo:e2e; then
    echo -e "${GREEN}✓ End-to-End Demo: PASS${NC}"
else
    echo -e "${RED}✗ End-to-End Demo: FAIL${NC}"
    exit 1
fi

echo ""
echo "Press Enter to continue to next test..."
read

# Test 2: Target Smoke Tests
echo "======================================"
echo "Test 2: Target Smoke Tests"
echo "======================================"
echo ""

if npm run test:targets; then
    echo -e "${GREEN}✓ Target Smoke Tests: PASS${NC}"
else
    echo -e "${RED}✗ Target Smoke Tests: FAIL${NC}"
    exit 1
fi

echo ""
echo "Press Enter to continue to next test..."
read

# Test 3: Failure Scenarios
echo "======================================"
echo "Test 3: Failure Scenario Tests"
echo "======================================"
echo ""

if npm run test:failures; then
    echo -e "${GREEN}✓ Failure Scenario Tests: PASS${NC}"
else
    echo -e "${RED}✗ Failure Scenario Tests: FAIL${NC}"
    exit 1
fi

echo ""
echo "======================================"
echo "All Tests Complete"
echo "======================================"
echo ""
echo -e "${GREEN}✓ All validation tests passed${NC}"
echo ""
echo "Next steps:"
echo "1. Start web UI: npm run dev"
echo "2. Visit inspection dashboard: http://localhost:3000/inspection"
echo "3. Configure credentials in settings"
echo "4. Set up delivery targets"
echo ""
echo "For more information, see:"
echo "- RUNBOOK.md - Complete developer guide"
echo "- QUICKREF.md - Quick reference"
echo "- VALIDATION_SUMMARY.md - Implementation summary"
echo ""
