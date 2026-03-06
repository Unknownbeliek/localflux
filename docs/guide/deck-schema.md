# Deck Schema

A deck is a single `.json` file placed in `data/decks/`.
The server loads it on startup via `DECK_PATH` (defaults to `data/decks/movie.json`).

---

## Top-level structure

```json
{
  "deck_meta": { ... },
  "questions": [ ... ]
}
```

| Key | Type | Required | Description |
|---|---|---|---|
| `deck_meta` | object | yes | Human-readable metadata — not used by the engine at runtime |
| `questions` | array | yes | Ordered list of question objects |

### `deck_meta` fields

| Field | Type | Description |
|---|---|---|
| `id` | string | Unique deck identifier |
| `title` | string | Display name (e.g. `"Hollywood Blockbusters"`) |
| `author` | string | Deck creator |
| `version` | string | Semver-style version string |
| `total_questions` | number | Informational — should match `questions.length` |

---

## Question object

```json
{
  "q_id": "q_01",
  "type": "text_only",
  "prompt": "Who directed the Lord of the Rings trilogy?",
  "asset_ref": null,
  "options": ["Steven Spielberg", "Peter Jackson", "James Cameron", "George Lucas"],
  "correct_answer": "Peter Jackson",
  "time_limit_ms": 10000,
  "fuzzy_allowances": ["Peter Jakson"]
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| `q_id` | string | yes | Unique ID within the deck (e.g. `"q_01"`) |
| `type` | string | yes | `"text_only"` or `"image_guess"` — see below |
| `prompt` | string | yes | The question text shown to players |
| `asset_ref` | string \| null | yes | Filename of the image asset for `image_guess`; `null` for `text_only` |
| `options` | string[] | yes | Exactly 4 answer choices |
| `correct_answer` | string | yes | Must exactly match one entry in `options` |
| `time_limit_ms` | number | yes | Milliseconds players have to answer (e.g. `15000` = 15 s) |
| `fuzzy_allowances` | string[] | yes | Accepted spelling variants (empty array `[]` if none) |

> **Security note:** `correct_answer` and `fuzzy_allowances` are stripped by
> `sanitizeQuestion()` in `core/deckLoader.js` before any question is sent
> to clients. They never appear in Socket.IO payloads.

---

## Question types

### `text_only`

A plain text question with four multiple-choice options.
Set `asset_ref` to `null`.

```json
{
  "q_id": "q_02",
  "type": "text_only",
  "prompt": "Who directed the Lord of the Rings trilogy?",
  "asset_ref": null,
  "options": ["Steven Spielberg", "Peter Jackson", "James Cameron", "George Lucas"],
  "correct_answer": "Peter Jackson",
  "time_limit_ms": 10000,
  "fuzzy_allowances": ["Peter Jakson"]
}
```

### `image_guess`

Shows an image alongside the prompt. `asset_ref` is the filename of a
`.webp` image stored in `data/vault/`.

```json
{
  "q_id": "q_01",
  "type": "image_guess",
  "prompt": "Which movie is this frame from?",
  "asset_ref": "interstellar_docking.webp",
  "options": ["Gravity", "Interstellar", "The Martian", "Apollo 13"],
  "correct_answer": "Interstellar",
  "time_limit_ms": 15000,
  "fuzzy_allowances": ["Interstelar", "Inter steller"]
}
```

> **Note:** Image delivery from `data/vault/` is not yet implemented in the
> current engine build. The `asset_ref` field is parsed and stored but the
> client does not render images yet. This is tracked as a planned feature.

---

## Adding your own deck

1. Create a `.json` file following the schema above
2. Place it in `data/decks/`
3. Set the `DECK_PATH` environment variable:

```bash
DECK_PATH=/absolute/path/to/data/decks/your-deck.json npm run dev
```

Or from the repo root:

```bash
DECK_PATH=data/decks/your-deck.json npm run dev --prefix server
```

The server validates the deck on startup and will throw a descriptive error
if `questions` is missing or is not an array.

---

## Validation rules enforced at startup

| Rule | Error thrown |
|---|---|
| File does not exist | `Deck not found: <path>` |
| `questions` key missing | `Deck at "..." is missing a "questions" array` |
| `questions` is not an array | Same as above |
