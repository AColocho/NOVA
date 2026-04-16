# NOVA UI Guidelines

## Overall direction

This app is warm, calm, and lightly editorial. It should feel homey and polished, not corporate, neon, or overly minimal.

The current visual language is already defined in `app/globals.css`. Follow it rather than introducing a new theme.

## Fonts

- Body font stack: `"Avenir Next", "Nunito Sans", "Segoe UI", sans-serif`
- Display font stack: `"Iowan Old Style", "Palatino Linotype", "Book Antiqua", serif`

Use:

- `font-display` for page titles and important section titles
- sans-serif body text for labels, descriptions, and controls

Do not swap in Inter, Roboto, or a new font stack unless the repo is being intentionally redesigned.

## Color system

Primary palette is warm and soft:

- Background: creamy off-white
- Foreground: warm brown text
- Primary: muted terracotta
- Secondary: pale sand
- Accent: soft wheat with a hint of green-blue in the page background
- Borders: very light warm brown

Practical usage:

- Main hero panels: `bg-white/80` with `border-white/70` and `backdrop-blur`
- Standard cards: use the shared `Card` primitive
- Soft emphasis blocks: `bg-secondary/55` to `bg-secondary/75`
- Highlight totals or key summaries: `bg-accent/55` to `bg-accent/75`
- Destructive actions: use the existing destructive button variant only when the action is truly destructive

Avoid:

- Pure black
- Saturated blue or purple accents
- Heavy gray UI
- Dark mode styling unless the repo explicitly adds it

## Shape and spacing

- Main hero sections use a large rounded shape around `2rem`
- Cards use a slightly smaller radius around `1.75rem`
- Inner pills and stat blocks often use `1rem` to `1.35rem`
- Buttons and inputs are pill-shaped by default

Spacing should feel open and calm:

- Most screens use `space-y-4` or `space-y-6`
- Card content should breathe; do not compress sections tightly
- Prefer 2-column desktop layouts for detail and create/edit screens when it helps scanning

## Background and surface treatment

- Keep the warm layered page background from `app/globals.css`
- Use glassy white panels and soft shadows instead of flat slabs
- Prefer a few tonal layers rather than hard outlines everywhere

## Icons

- Use Lucide icons
- Place leading icons in soft rounded containers for major cards or hero blocks
- Keep icon sizes moderate: usually `size-4`, `size-5`, `size-6`, or `size-7`

## Copy style inside the UI

- Short, plain, calm
- Friendly but not cute
- Avoid internal system language
- Prefer “Savings” over “discount_amount” concepts in labels
- Prefer “Items” over “line items” unless the context truly needs the precision

## Interaction patterns

- Primary mutations should usually toast on success and redirect
- Empty states should suggest the next action clearly
- Loading should use skeletons rather than blank screens
- Error states should be readable and retryable where possible

## When adding a new screen

Match the existing receipts/recipes rhythm:

- top hero section with `PageIntro`
- one obvious primary action
- cards grouped by purpose
- readable desktop grid
- mobile-first stacking

If a new screen looks colder, flatter, or more dashboard-like than recipes and receipts, it is probably drifting away from the repo’s style.
