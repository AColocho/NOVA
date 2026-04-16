# NOVA UI Feature Notes

## UI Behavior Expected In This Repo

- List and detail screens should match the rhythm used by recipes and receipts: hero section, clear primary action, then card-based content.
- Use `PageIntro`, `Card`, `Button`, `Input`, `Textarea`, `EmptyState`, `ErrorState`, and `Skeleton` before inventing new wrappers.
- Loading states should be visible.
- Empty states should be explicit and action-oriented.
- Error copy should be plain and short.

## Copy Rules

- Write for non-technical users.
- Do not mention backend, schema, parser, payload, model, endpoint, storage key, or similar internal terms in user-facing UI.
- Prefer words like `save`, `upload`, `details`, `items`, `steps`, `savings`, `store`, and `receipt`.
- Receipts screens should not expose internal scan file paths or storage locations.

## Known Feature-Specific Quirks

- `create_receipt_from_scan` can take longer than a normal request and does not return a receipt id the UI can open directly; after upload, route users back to the receipts list.
- `update_receipt` replaces the current item and savings lists when they are sent; edit screens should submit the full current list, not partial patches.
- Recipe import from URL also does not open a detail screen directly today; it returns users to the recipe list.
- Analytics is intentionally a placeholder and should not be presented as a finished reporting feature.

## Product Consistency

- Keep the receipts and recipes areas visually and behaviorally aligned with each other.
- If a new screen feels colder, flatter, or more technical than the current core flows, bring it back toward the existing product tone.
