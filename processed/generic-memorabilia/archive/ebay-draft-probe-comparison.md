# Seller Hub Draft Probe Comparison

## Evidence

- `ebay-receipt-upload-clean-10-v2-Aug-2026-16-11-56-56-12339462553.csv`
- `ebay-upload-clean-10-v2-Aug-2026-17-12-06-06-11327986695.csv`

Both receipts contain 10 rows with `Action=Draft`, `Status=Failure`,
`ErrorCode=BAF.Error.5`, and the same message:

`Unable to find Task Action Id for task Draft`

The item labels and row-level errors are identical. Neither receipt contains
task timestamps or a task/feed identifier, so no meaningful run-level
difference can be established from the downloaded evidence.

## Current supported boundary

Official eBay Seller Hub feed documentation states:

- `FX_LISTING` is the Seller Hub feed type for creating new listings and new
  drafts.
- `Action=Draft` selects the create-draft operation within that feed.
- Seller Hub task schema version is `1.0`.
- The Create new drafts flow maps to the `VerifyAddItem` operation.

`FX_DRAFT` is not listed as an official Seller Hub feed type. The community
report remains reconnaissance, not authority.

The three contract layers are distinct:

1. Internal listing state: `draft`
2. CSV action: `Draft`
3. Sell Feed task: `feedType=FX_LISTING`, `schemaVersion=1.0`

## Next human action

Use the Seller Hub Reports Uploads workflow or its supported task creation
surface to submit the unchanged `ebay-upload-clean-10-v2.csv` as an
`FX_LISTING` task with `Action=Draft`. Do not select or invent `FX_DRAFT`.
Download the resulting task report and preserve it alongside these receipts.
