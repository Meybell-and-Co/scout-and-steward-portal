# Scout & Steward Portal — Plumbing Tests

Status: Passed
Initial verification date: 2026-08-08

## Purpose

This document records end-to-end verification of the Scout & Steward
Portal infrastructure.

These tests demonstrate that the Portal can receive a controlled
publication, protect its write boundary, persist a non-canonical
inventory snapshot in D1, and return that snapshot through the Portal
API.

The Portal database is not canonical inventory.

Canonical inventory remains owned by the sports-card-import system.
Portal records are subordinate snapshots and workflow records derived
from canonical data.

## Verified Architecture

sports-card-import / authorized publisher
        |
        | authenticated publication
        v
Cloudflare Worker
        |
        | authentication
        | payload validation
        v
Cloudflare D1
        |
        | publications
        | inventory_snapshots
        v
Cloudflare Worker
        |
        | Portal-safe read projection
        v
Portal consumer

## Test 1 — Worker Health

Endpoint:

GET /api/health

Result:

PASS

The deployed Worker successfully returned its health response.

## Test 2 — D1 Connectivity

Endpoint:

GET /api/db-health

Result:

PASS

The Worker successfully connected to the remote D1 database and
returned the migrated database tables.

This proved:

Worker -> D1 connectivity
D1 binding availability
successful remote schema migration

## Test 3 — Unauthorized Publication

Endpoint:

POST /api/publish

Authentication:

None

Expected result:

401 Unauthorized

Actual result:

401 Unauthorized

Result:

PASS

An unauthenticated caller was able to reach the publication endpoint
but was rejected before publication processing.

## Test 4 — Authorized Publication Gate

Endpoint:

POST /api/publish

Authentication:

Valid PUBLISH_TOKEN

Expected result:

Successful authentication with no database write

Actual result:

200 OK

Result:

PASS

This test was completed before persistence behavior was added to the
publication service.

It demonstrated that the Worker could distinguish an authorized
publisher from an unauthorized caller.

## Test 5 — Payload Validation

Endpoint:

POST /api/publish

Authentication:

Valid PUBLISH_TOKEN

Test payload intentionally contained:

empty source_version
empty item_id
non-integer year
negative recommended_price_cents

Expected result:

400 Bad Request
validation_failed

Actual result:

400 Bad Request
validation_failed

Result:

PASS

Authentication alone does not authorize arbitrary data.

Publication payloads must also satisfy the Portal publication contract.

## Test 6 — Valid Payload Without Persistence

Endpoint:

POST /api/publish

Authentication:

Valid PUBLISH_TOKEN

Payload:

source_version: plumbing-test-001
item_id: TEST_0001

Expected result:

200 OK
authenticated: true
validated: true
no data written

Actual result:

200 OK

Result:

PASS

This test proved the complete authentication and validation path before
database write capability was introduced.

## Test 7 — Controlled D1 Publication

Endpoint:

POST /api/publish

Authentication:

Valid PUBLISH_TOKEN

Test record:

source_version: plumbing-test-001
item_id: TEST_0001
player_name: Test Player
team: Test Team
year: 1993
manufacturer: Test Manufacturer
set_name: Test Set
card_number: 1
classification: test
recommended_price_cents: 1400

Expected result:

201 Created

Actual result:

201 Created

Result:

PASS

The Portal generated its own publication_id and snapshot_id.

The publication and inventory snapshot were submitted to D1 as a
controlled batch.

## Test 8 — Independent D1 Verification

Remote D1 was queried directly using Wrangler.

The publications table contained:

source_version: plumbing-test-001
status: completed
item_count: 1

The inventory_snapshots table contained:

item_id: TEST_0001
player_name: Test Player
team: Test Team
year: 1993
manufacturer: Test Manufacturer
set_name: Test Set
card_number: 1
classification: test
recommended_price_cents: 1400

The publication_id stored on the inventory snapshot matched the
publication_id stored on its parent publication.

Result:

PASS

This independently verified that the Worker had actually persisted the
publication rather than merely returning a successful HTTP response.

## Test 9 — Portal Read Path

Endpoint:

GET /api/items

Expected result:

Portal-safe JSON containing TEST_0001

Actual result:

status: ok
item_count: 1
item_id: TEST_0001

Result:

PASS

The record returned through the API matched the record independently
verified in D1.

## Test 10 — Current Snapshot Resolution

A second publication was created for the existing test item.

Original publication:

source_version: plumbing-test-001
item_id: TEST_0001
team: Test Team
year: 1993
recommended_price_cents: 1400

Updated publication:

source_version: plumbing-test-002
item_id: TEST_0001
team: Updated Test Team
year: 1994
recommended_price_cents: 1750

Direct D1 verification confirmed that both historical snapshots remained
stored.

GET /api/items returned only one record for TEST_0001.

The returned record was the newer snapshot:

source_version: plumbing-test-002
team: Updated Test Team
year: 1994
recommended_price_cents: 1750

Result:

PASS

This proves that D1 preserves historical publication snapshots while the
Portal read API exposes only the current completed snapshot for each
item.

Historical truth and current operational state therefore remain
separate concerns.

## End-to-End Result

PASS

The following circuit has been verified:

authorized caller
-> Worker
-> authentication
-> validation
-> D1 publication
-> D1 inventory snapshot
-> Worker read service
-> Portal-safe JSON
-> browser

## Security Controls Verified

PUBLISH_TOKEN is stored as a Cloudflare Worker secret.

The secret value is not stored in Git or Wrangler configuration.

The Worker rejects publication attempts without valid authentication.

Authenticated payloads are independently validated before persistence.

Portal-generated database identifiers are not supplied by the
publisher.

Canonical inventory is not modified by Portal publication.

## Current Snapshot Behavior

GET /api/items resolves multiple historical snapshots of the same
item_id and exposes only the newest snapshot belonging to a completed
publication.

Historical snapshots remain stored in D1 for provenance and audit
purposes.

This behavior was verified using two successive publications of the
same test item.

## Test Fixture

The following disposable test data remains in D1 temporarily:

source_version: plumbing-test-001
item_id: TEST_0001

This fixture should remain until the current-snapshot read behavior is
implemented and tested.

After that verification succeeds, the fixture may be removed before the
first canonical publication.

## Next Milestones

1. Implement current-snapshot read behavior.
2. Verify snapshot history does not create duplicate current items.
3. Remove plumbing-test-001 and TEST_0001.
4. Implement the publisher in sports-card-import.
5. Define and enforce the canonical-to-Portal projection.
6. Publish one real canonical inventory item.
7. Independently verify the canonical publication in D1.
8. Verify the real item through the Portal read API.
