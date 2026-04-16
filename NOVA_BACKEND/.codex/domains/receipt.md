# Receipt Domain

## Files

- `backend/receipt/receipt.py`
- `backend/receipt/model.py`
- `backend/receipt/logic.py`

## Behavior

- Receipts can be created manually or parsed from uploaded scans.
- Scan files are stored in object storage.
- Receipt records are scoped by `home_id`.

## Route Rules

- Routes should stay thin.
- Protected routes should require auth and pass `home_id` and `user_id` into logic where needed.

## Logic Rules

- Build receipt, item, and discount entities through helpers.
- Serialize metadata and full receipt payloads explicitly.
- All read/update/delete queries must scope by `Receipt.home_id`.
- Preserve explicit validation around file type and empty uploads.

## Storage Rules

- Use `StorageClient` for object storage.
- Read storage config only from environment variables.
- Receipt upload keys are home-scoped:
  - `homes/<home_id>/upload_date=YYYY-MM-DD/<uuid>.<ext>`

## GPT Rules

- Use structured outputs for receipt extraction.
- Reject unusable or item-less parsed receipts.
