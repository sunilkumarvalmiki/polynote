# PolyNote Test Plan - Comprehensive Coverage Strategy

**Target:** 350+ tests across all packages  
**Current Status:** 69 tests passing (41 connectors + 28 shared)  
**Coverage Goal:** 90%+ across all packages

---

## Executive Summary

This document outlines a comprehensive testing strategy for the PolyNote project, targeting 350+ tests to achieve 90%+ code coverage across all packages. The plan is organized by package, component, and test category.

### Current Test Coverage

**Connectors Package (16.11% coverage):**
- ✅ BaseConnector.ts: 100% coverage (24 tests)
- ✅ ConnectorRegistry.ts: 100% coverage (17 tests)
- ❌ JoplinConnector.ts: 0% coverage (219 lines)
- ❌ NotionConnector.ts: 0% coverage (427 lines)
- ❌ ObsidianConnector.ts: 0% coverage (208 lines)
- ❌ Missing: StandardNotesConnector (estimated 250 lines)
- ❌ Missing: TriliumConnector (estimated 280 lines)

**Shared Package (76.5% coverage):**
- ✅ connection.ts: 98.19% coverage (20 tests)
- ✅ checksum.ts: 81.81% coverage (8 tests)
- ❌ index.ts: 0% coverage (33 lines)

---

## Test Distribution Plan

### Package 1: Shared Package Tests (70 total tests)

#### 1.1 Database Connection Tests (30 tests)
**File:** `packages/shared/src/db/__tests__/connection.test.ts`

**Current:** 20 tests ✅  
**Additional:** 10 tests

**New Test Cases:**
1. Database initialization edge cases (3 tests)
   - Test database creation in non-existent directory
   - Test database with corrupted schema file
   - Test multiple simultaneous initialization attempts

2. Transaction edge cases (2 tests)
   - Test nested transactions
   - Test transaction with database lock timeout

3. Query performance tests (2 tests)
   - Test query with large result sets (10,000+ rows)
   - Test concurrent query execution

4. Error recovery tests (3 tests)
   - Test database recovery after corruption
   - Test connection pool exhaustion
   - Test WAL checkpoint failures

#### 1.2 Checksum Utility Tests (15 tests)
**File:** `packages/shared/src/utils/__tests__/checksum.test.ts`

**Current:** 8 tests ✅  
**Additional:** 7 tests

**New Test Cases:**
1. Performance tests (2 tests)
   - Test checksum generation for large content (1MB+)
   - Test batch checksum generation

2. Edge cases (3 tests)
   - Test checksum with empty string
   - Test checksum with null/undefined input
   - Test checksum with special Unicode characters

3. Collision detection (2 tests)
   - Test checksum uniqueness across similar inputs
   - Test checksum stability across runs

#### 1.3 Type System Tests (10 tests)
**File:** `packages/shared/src/__tests__/types.test.ts` (NEW)

**Test Cases:**
1. Note type validation (5 tests)
   - Test valid note creation
   - Test invalid note properties
   - Test note with missing required fields
   - Test note with extra properties
   - Test note type guards

2. Connector config validation (5 tests)
   - Test each connector config type
   - Test config with invalid properties
   - Test config serialization/deserialization

#### 1.4 Index Export Tests (5 tests)
**File:** `packages/shared/src/__tests__/index.test.ts` (NEW)

**Test Cases:**
1. Export validation (5 tests)
   - Test all exports are accessible
   - Test re-export paths
   - Test TypeScript type exports
   - Test default exports
   - Test named exports

#### 1.5 Schema Validation Tests (10 tests)
**File:** `packages/shared/src/db/__tests__/schema.test.ts` (NEW)

**Test Cases:**
1. Table structure tests (4 tests)
   - Test all tables created correctly
   - Test foreign key constraints
   - Test index creation
   - Test trigger creation

2. Data integrity tests (3 tests)
   - Test CASCADE delete behavior
   - Test UNIQUE constraints
   - Test CHECK constraints

3. Migration tests (3 tests)
   - Test schema upgrades
   - Test data preservation during migration
   - Test rollback capability

---

### Package 2: Connector Tests (280 total tests)

#### 2.1 Joplin Connector Tests (50 tests)
**File:** `packages/connectors/src/joplin/__tests__/JoplinConnector.test.ts` (NEW)

**Test Categories:**

**Initialization (8 tests):**
1. Test successful initialization with valid config
2. Test initialization failure with missing API token
3. Test initialization with custom API URL
4. Test initialization with default API URL
5. Test API connection verification
6. Test initialization timeout handling
7. Test initialization with invalid API URL
8. Test re-initialization behavior

**Authentication (5 tests):**
9. Test successful authentication
10. Test authentication with invalid token
11. Test token refresh
12. Test authentication timeout
13. Test authentication error handling

**Fetch Notes (12 tests):**
14. Test fetch all notes
15. Test fetch with pagination
16. Test fetch with filters
17. Test fetch with sorting
18. Test fetch empty result
19. Test fetch with API rate limiting
20. Test fetch with network errors
21. Test fetch with malformed response
22. Test fetch with cursor-based pagination
23. Test fetch incremental updates
24. Test fetch with parent-child relationships
25. Test fetch with tags

**Push Notes (10 tests):**
26. Test create new note
27. Test update existing note
28. Test delete note
29. Test push with validation errors
30. Test push with API errors
31. Test push with conflict resolution
32. Test batch push operations
33. Test push with attachments
34. Test push with metadata
35. Test push with retries

**Sync (8 tests):**
36. Test full sync
37. Test incremental sync
38. Test bi-directional sync
39. Test conflict detection
40. Test conflict resolution strategies
41. Test sync with errors
42. Test sync status tracking
43. Test sync interruption recovery

**Data Transformation (7 tests):**
44. Test Joplin note to PolyNote note conversion
45. Test PolyNote note to Joplin note conversion
46. Test markdown parsing
47. Test frontmatter handling
48. Test tag extraction
49. Test link extraction
50. Test metadata preservation

#### 2.2 Notion Connector Tests (60 tests)
**File:** `packages/connectors/src/notion/__tests__/NotionConnector.test.ts` (NEW)

**Test Categories:**

**Initialization (10 tests):**
1. Test successful initialization
2. Test OAuth flow initialization
3. Test API key authentication
4. Test workspace selection
5. Test database discovery
6. Test page tree traversal
7. Test initialization with rate limiting
8. Test initialization retry logic
9. Test initialization timeout
10. Test connection verification

**Authentication (8 tests):**
11. Test OAuth 2.0 flow
12. Test access token refresh
13. Test API key validation
14. Test permission verification
15. Test workspace access
16. Test authentication errors
17. Test token expiration handling
18. Test multi-workspace support

**Fetch Operations (15 tests):**
19. Test fetch databases
20. Test fetch pages from database
21. Test fetch page content
22. Test fetch page blocks
23. Test fetch nested blocks
24. Test fetch with filters
25. Test fetch with pagination
26. Test fetch with sorting
27. Test fetch rich text content
28. Test fetch properties
29. Test fetch relations
30. Test fetch formulas
31. Test fetch rollups
32. Test rate limit handling
33. Test fetch error recovery

**Push Operations (12 tests):**
34. Test create database
35. Test create page
36. Test update page
37. Test delete page
38. Test create blocks
39. Test update blocks
40. Test delete blocks
41. Test handle block limits
42. Test batch operations
43. Test property updates
44. Test relation updates
45. Test push with validation

**Sync (8 tests):**
46. Test full sync
47. Test incremental sync
48. Test database-level sync
49. Test page-level sync
50. Test block-level sync
51. Test conflict resolution
52. Test sync cursor management
53. Test webhook integration

**Data Transformation (7 tests):**
54. Test Notion page to PolyNote note
55. Test PolyNote note to Notion page
56. Test block conversion
57. Test rich text parsing
58. Test property mapping
59. Test database schema mapping
60. Test file attachment handling

#### 2.3 Obsidian Connector Tests (45 tests)
**File:** `packages/connectors/src/obsidian/__tests__/ObsidianConnector.test.ts` (NEW)

**Test Categories:**

**Initialization (8 tests):**
1. Test vault path validation
2. Test vault discovery
3. Test file watcher setup
4. Test initialization with missing vault
5. Test initialization with invalid path
6. Test initialization with permissions
7. Test multi-vault support
8. Test configuration loading

**File Operations (15 tests):**
9. Test read markdown file
10. Test write markdown file
11. Test update markdown file
12. Test delete markdown file
13. Test file metadata extraction
14. Test frontmatter parsing
15. Test YAML frontmatter handling
16. Test file encoding handling
17. Test binary file handling
18. Test symlink handling
19. Test hidden file filtering
20. Test nested directory handling
21. Test file rename detection
22. Test file move detection
23. Test concurrent file operations

**Sync (10 tests):**
24. Test real-time file watching
25. Test batch file scanning
26. Test incremental sync
27. Test full vault sync
28. Test conflict detection
29. Test file change debouncing
30. Test sync with file locks
31. Test sync error recovery
32. Test sync status reporting
33. Test sync performance optimization

**Link Processing (7 tests):**
34. Test wiki-link parsing
35. Test markdown link parsing
36. Test backlink generation
37. Test embedded note handling
38. Test link resolution
39. Test broken link detection
40. Test link update on file move

**Data Transformation (5 tests):**
41. Test markdown to PolyNote note
42. Test PolyNote note to markdown
43. Test tag extraction from content
44. Test metadata preservation
45. Test custom property handling

#### 2.4 Standard Notes Connector Tests (55 tests)
**File:** `packages/connectors/src/standardnotes/__tests__/StandardNotesConnector.test.ts` (NEW)

**Note:** This connector needs to be implemented first

**Test Categories:**

**Initialization (10 tests):**
1. Test successful initialization
2. Test server configuration
3. Test self-hosted server support
4. Test encryption setup
5. Test authentication flow
6. Test session management
7. Test offline mode initialization
8. Test sync token initialization
9. Test protocol version negotiation
10. Test initialization error handling

**Authentication (8 tests):**
11. Test email/password login
12. Test two-factor authentication
13. Test biometric authentication
14. Test session persistence
15. Test session expiration
16. Test password change handling
17. Test account registration
18. Test authentication errors

**Encryption (10 tests):**
19. Test end-to-end encryption
20. Test key derivation
21. Test encryption key rotation
22. Test decryption process
23. Test encryption performance
24. Test encrypted sync
25. Test offline encryption
26. Test encryption with 2FA
27. Test master key handling
28. Test encryption error recovery

**Fetch Operations (10 tests):**
29. Test fetch all items
30. Test fetch with filters
31. Test fetch encrypted items
32. Test fetch with pagination
33. Test fetch with sync tokens
34. Test fetch deleted items
35. Test fetch shared items
36. Test fetch with conflicts
37. Test fetch performance
38. Test fetch error handling

**Push Operations (10 tests):**
39. Test create item
40. Test update item
41. Test delete item
42. Test encrypt and push
43. Test batch operations
44. Test push with conflicts
45. Test push with validation
46. Test push encrypted content
47. Test push with sync tokens
48. Test push error recovery

**Sync (7 tests):**
49. Test delta sync
50. Test full sync
51. Test conflict resolution
52. Test sync with encryption
53. Test offline sync queue
54. Test sync token management
55. Test sync error handling

#### 2.5 Trilium Connector Tests (50 tests)
**File:** `packages/connectors/src/trilium/__tests__/TriliumConnector.test.ts` (NEW)

**Note:** This connector needs to be implemented first

**Test Categories:**

**Initialization (8 tests):**
1. Test server connection
2. Test ETAPI authentication
3. Test tree structure loading
4. Test workspace configuration
5. Test initialization with custom port
6. Test SSL/TLS support
7. Test initialization timeout
8. Test connection retry logic

**Authentication (6 tests):**
9. Test ETAPI token authentication
10. Test token validation
11. Test token refresh
12. Test permission checking
13. Test multi-user support
14. Test authentication errors

**Tree Navigation (10 tests):**
15. Test fetch note tree
16. Test navigate hierarchy
17. Test fetch note by ID
18. Test fetch note by path
19. Test fetch child notes
20. Test fetch parent notes
21. Test fetch note relations
22. Test fetch cloned notes
23. Test tree search
24. Test tree filtering

**Note Operations (12 tests):**
25. Test fetch note content
26. Test fetch note metadata
27. Test create note
28. Test update note
29. Test delete note
30. Test move note
31. Test clone note
32. Test note attributes
33. Test note relations
34. Test note labels
35. Test note revisions
36. Test batch operations

**Sync (8 tests):**
37. Test full sync
38. Test incremental sync
39. Test tree sync
40. Test conflict detection
41. Test conflict resolution
42. Test sync status
43. Test sync with branches
44. Test sync with clones

**Data Transformation (6 tests):**
45. Test Trilium note to PolyNote
46. Test PolyNote to Trilium note
47. Test HTML content handling
48. Test attribute mapping
49. Test relation mapping
50. Test tree structure preservation

#### 2.6 Additional Connector Tests (20 tests)

**Integration Tests (10 tests):**
**File:** `packages/connectors/src/__tests__/integration.test.ts` (NEW)

1. Test multi-connector sync
2. Test connector priority handling
3. Test cross-connector conflict resolution
4. Test connector registry with all connectors
5. Test connector enable/disable
6. Test connector configuration persistence
7. Test connector error isolation
8. Test connector performance comparison
9. Test connector resource management
10. Test connector cleanup

**Error Handling Tests (10 tests):**
**File:** `packages/connectors/src/__tests__/error-handling.test.ts` (NEW)

1. Test network failure recovery
2. Test API rate limit handling
3. Test timeout handling
4. Test retry strategies
5. Test circuit breaker pattern
6. Test error logging
7. Test error reporting
8. Test graceful degradation
9. Test error recovery workflows
10. Test error notification system

---

## Implementation Timeline

### Phase 1: Foundation (Days 1-2)
- ✅ Fix existing test failures
- ✅ Achieve 100% coverage on BaseConnector
- ✅ Achieve 100% coverage on ConnectorRegistry
- ⏳ Complete shared package tests (70 tests total)

### Phase 2: Existing Connectors (Days 3-5)
- Joplin Connector tests (50 tests)
- Notion Connector tests (60 tests)
- Obsidian Connector tests (45 tests)

### Phase 3: New Connectors (Days 6-8)
- Implement Standard Notes Connector
- Standard Notes Connector tests (55 tests)
- Implement Trilium Connector
- Trilium Connector tests (50 tests)

### Phase 4: Integration & Polish (Days 9-10)
- Integration tests (10 tests)
- Error handling tests (10 tests)
- Performance optimization
- Documentation updates

---

## Test Execution Strategy

### Test Organization
```
packages/
├── connectors/
│   ├── src/
│   │   ├── __tests__/
│   │   │   ├── BaseConnector.test.ts (24 tests) ✅
│   │   │   ├── ConnectorRegistry.test.ts (17 tests) ✅
│   │   │   ├── integration.test.ts (10 tests) 📝
│   │   │   └── error-handling.test.ts (10 tests) 📝
│   │   ├── joplin/
│   │   │   └── __tests__/
│   │   │       └── JoplinConnector.test.ts (50 tests) 📝
│   │   ├── notion/
│   │   │   └── __tests__/
│   │   │       └── NotionConnector.test.ts (60 tests) 📝
│   │   ├── obsidian/
│   │   │   └── __tests__/
│   │   │       └── ObsidianConnector.test.ts (45 tests) 📝
│   │   ├── standardnotes/
│   │   │   ├── StandardNotesConnector.ts (NEW) 📝
│   │   │   └── __tests__/
│   │   │       └── StandardNotesConnector.test.ts (55 tests) 📝
│   │   └── trilium/
│   │       ├── TriliumConnector.ts (NEW) 📝
│   │       └── __tests__/
│   │           └── TriliumConnector.test.ts (50 tests) 📝
└── shared/
    └── src/
        ├── __tests__/
        │   ├── types.test.ts (10 tests) 📝
        │   └── index.test.ts (5 tests) 📝
        ├── db/
        │   └── __tests__/
        │       ├── connection.test.ts (30 tests) ✅ + 📝
        │       └── schema.test.ts (10 tests) 📝
        └── utils/
            └── __tests__/
                └── checksum.test.ts (15 tests) ✅ + 📝
```

Legend:
- ✅ = Implemented and passing
- 📝 = To be implemented

---

## Coverage Targets

### Package-Level Targets
- **Shared Package:** 95%+ (currently 76.5%)
- **Connectors Package:** 90%+ (currently 16.11%)
- **Overall Project:** 90%+ (currently ~46%)

### File-Level Targets
- All connector implementations: 90%+
- All utility functions: 95%+
- All database operations: 95%+
- All type definitions: 100%

---

## Testing Best Practices

### 1. Test Structure
- Use descriptive test names
- Follow AAA pattern (Arrange, Act, Assert)
- One assertion per test when possible
- Group related tests using describe blocks

### 2. Mocking Strategy
- Mock external API calls
- Mock file system operations
- Mock database operations for unit tests
- Use real implementations for integration tests

### 3. Test Data Management
- Use factories for test data generation
- Clean up test data in afterEach/afterAll hooks
- Use unique IDs for test isolation
- Avoid test interdependencies

### 4. Performance Considerations
- Keep unit tests under 100ms each
- Use parallel execution where possible
- Optimize database operations in tests
- Use test timeouts appropriately

### 5. CI/CD Integration
- Run tests on every commit
- Generate coverage reports
- Fail builds on coverage regression
- Run tests in parallel

---

## Success Metrics

### Quantitative Metrics
- **Total Tests:** 350+ (currently 69)
- **Code Coverage:** 90%+ (currently ~46%)
- **Test Execution Time:** <2 minutes
- **Test Pass Rate:** 100%

### Qualitative Metrics
- All critical paths tested
- Edge cases covered
- Error scenarios handled
- Performance validated
- Integration verified

---

## Risk Mitigation

### Technical Risks
1. **API Changes:** Mock external APIs to prevent test brittleness
2. **File System:** Use temporary directories for file operations
3. **Database:** Use in-memory SQLite for faster tests
4. **Network:** Mock all network calls in unit tests
5. **Time-Dependent:** Use fake timers for time-sensitive tests

### Process Risks
1. **Scope Creep:** Stick to defined test plan
2. **Test Maintenance:** Keep tests simple and focused
3. **False Positives:** Review flaky tests immediately
4. **Coverage Gaming:** Focus on meaningful coverage, not just numbers

---

## Next Steps

1. **Immediate Actions:**
   - Review and approve this test plan
   - Set up test infrastructure for new files
   - Create test utilities and factories
   - Establish mocking patterns

2. **Week 1 Goals:**
   - Complete all shared package tests (70 total)
   - Achieve 95%+ coverage in shared package
   - Begin Joplin connector tests

3. **Week 2 Goals:**
   - Complete existing connector tests (155 tests)
   - Achieve 90%+ coverage in existing connectors
   - Begin implementing missing connectors

4. **Week 3 Goals:**
   - Implement and test Standard Notes connector (55 tests)
   - Implement and test Trilium connector (50 tests)
   - Complete integration tests (20 tests)

5. **Final Review:**
   - Verify all 350+ tests passing
   - Confirm 90%+ coverage achieved
   - Generate comprehensive coverage report
   - Document any remaining gaps

---

## Appendix: Test Utilities

### A. Common Test Utilities Needed
```typescript
// Test factories
- createTestNote()
- createTestConnectorConfig()
- createTestDatabase()

// Mock builders
- mockJoplinAPI()
- mockNotionAPI()
- mockFileSystem()

// Test helpers
- waitForSync()
- assertNoteEqual()
- assertDatabaseState()
```

### B. Performance Benchmarks
- Unit test: <100ms
- Integration test: <500ms
- E2E test: <2s
- Full suite: <2min

### C. Coverage Thresholds (vitest.config.ts)
```typescript
coverage: {
  lines: 90,
  functions: 90,
  branches: 85,
  statements: 90
}
```

---

**Document Version:** 1.0  
**Last Updated:** October 4, 2025  
**Status:** Ready for Implementation