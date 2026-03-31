# Deck Studio

Deck Studio is a browser-based deck editor built into LocalFlux. Create, edit, import, and export trivia decks without touching JSON files.

## Quick Start

1. From the Home screen: click **Deck Studio**
2. Create a new deck or import from CSV
3. Add/edit cards with questions and answers
4. Export as `.flux` format

---

## Creating a Deck

### Method 1: Manual Creation

1. Click **+ New Deck**
2. Enter deck metadata:
   - **Deck Title**: Display name (e.g., "Movie Trivia")
   - **Author**: Your name
   - **Description**: What the deck is about
3. Click **Add Card**
4. Fill in:
   - **Type**: "Multiple Choice" or "Type Guess"
   - **Question**: The prompt players see
   - **Answer**: For MCQ, the correct option; for Type Guess, the expected text
   - **Options** (MCQ only): Four answer choices
   - **Time Limit**: Seconds players have to answer (default: 15)
   - **Variants** (Type Guess only): Alternative spellings/phrasings (comma-separated)
5. Click **Save Card**
6. Repeat for each question

### Method 2: CSV Import

CSV import is the fastest way to add questions in bulk.

**CSV Format:**

```csv
type,question,answer,option_2,option_3,option_4,time_limit_ms
text_only,Who directed Avatar?,James Cameron,Steven Spielberg,Christopher Nolan,Martin Scorsese,15000
text_only,Best-selling book ever written?,Bible,Quran,Don Quixote,Harry Potter,10000
typing,Capital of France?,Paris,"","",,15000
```

| Column | Required | Values |
|---|---|---|
| `type` | ✓ | `text_only` (MCQ) or `typing` (Type Guess) |
| `question` | ✓ | The question text |
| `answer` | ✓ | Correct answer |
| `option_2`, `option_3`, `option_4` | MCQ only | Three distractor options |
| `time_limit_ms` | ✓ | Milliseconds (default: 15000) |

::: warning CSV Validation
The editor validates all rows before import. If a deck has fewer than 2 questions or 4 options (MCQ), import fails with a descriptive error.
:::

**To import:**

1. Click **Import from CSV**
2. Paste or upload a CSV file
3. Review the preview
4. Click **Confirm Import**

---

## Editing Decks

### Add a Question

1. Click **+ Add Card**
2. Fill in metadata
3. Click **Save Card**

### Edit a Question

1. Click the card you want to edit
2. Modify the fields
3. Click **Update Card**

### Delete a Question

1. Click the delete icon (🗑️) on the card
2. Confirm the deletion

### Reorder Questions

Drag the cards to reorder them. The order is preserved during export.

---

## Exporting Decks

### .flux Format

Click **Export** to download your deck as a `.flux` file (standard JSON format).

```bash
# Move it to the server's data directory
mv ~/Downloads/my-deck.flux server/data/decks/

# Load it on next server start
DECK_PATH=data/decks/my-deck.flux npm run dev --prefix server
```

### Using an Exported Deck

After exporting and moving the deck to `server/data/decks/`:

```bash
# From the repo root
DECK_PATH=data/decks/my-deck.flux npm run dev
```

The deck will be loaded and playable immediately.

---

## Deck Validation

Deck Studio validates your deck before export. It checks:

| Rule | Error | Fix |
|---|---|---|
| Duplicate question text | "Duplicate questions detected" | Rename one question |
| Fewer than 2 questions | "Deck must have at least 2 questions" | Add more cards |
| MCQ missing an option | "Question X: missing option" | Add a distractor |
| Missing correct answer | "Question X: no answer specified" | Set the answer |
| Type Guess with empty options field | (Allowed — Type Guess doesn't need MCQ options) | OK |

---

## Question Types

### Multiple Choice (text_only)

Players see four options and tap the correct one.

```json
{
  "q_id": "q_01",
  "type": "text_only",
  "prompt": "Who directed Avatar?",
  "options": ["James Cameron", "Steven Spielberg", "Christopher Nolan", "Martin Scorsese"],
  "correct_answer": "James Cameron",
  "time_limit_ms": 15000,
  "fuzzy_allowances": [],
  "asset_ref": null
}
```

### Image Guess (image_guess)

Players see an image and choose from four options. Image delivery is currently in development.

```json
{
  "q_id": "q_02",
  "type": "image_guess",
  "prompt": "Which movie is this frame from?",
  "asset_ref": "avatar-pandora.webp",
  "options": ["Avatar", "Avatar: Way of Water", "Titanic", "Aliens"],
  "correct_answer": "Avatar: Way of Water",
  "time_limit_ms": 15000,
  "fuzzy_allowances": [],
}
```

### Type Guess (typing)

Players type their answer. Server fuzzy-matches against the correct answer and variants.

```json
{
  "q_id": "q_03",
  "type": "typing",
  "prompt": "What planet is Superman from?",
  "correct_answer": "Krypton",
  "fuzzy_allowances": ["krypton", "Crypton"],
  "time_limit_ms": 15000,
  "options": [],
  "asset_ref": null
}
```

---

## Tips & Best Practices

### Keep It Balanced

- Avoid one type dominating (e.g., 90% MCQ, 10% Type Guess)
- Mix difficulty levels throughout the deck
- Vary question lengths

### Use Variants for Type Guess

For Type Guess questions, add common spelling mistakes and alternate phrasings:

```
Answer: Pyongyang
Variants: Pyongyang, Pyong Yang, North Korea capital
```

### Time Limits

| Difficulty | Suggested Limit |
|---|---|
| Easy trivia | 20–30 seconds |
| Medium trivia | 15–20 seconds |
| Hard trivia | 10–15 seconds |
| Timed sprint | 5–10 seconds |

### CSV Best Practices

1. Keep column names consistent — Deck Studio expects exactly `type`, `question`, `answer`, `option_2`, `option_3`, `option_4`, `time_limit_ms`
2. Use quotes around cells with commas: `"Paris, France"`
3. Leave option columns empty for Type Guess questions
4. Test in Deck Studio before export

---

## Troubleshooting

### Import fails with "Invalid CSV format"

- Check that your CSV has 7 columns in the correct order
- Ensure column headers match exactly: `type`, `question`, `answer`, `option_2`, `option_3`, `option_4`, `time_limit_ms`
- Use quotes around cells with special characters

### Exported deck won't load

- Confirm the `.flux` file was placed in `server/data/decks/`
- Validate it's valid JSON: `node -e "require('./server/data/decks/my-deck.flux')"`
- Check `DECK_PATH` points to the correct file

### Cards disappear after refresh

Deck Studio stores decks in browser localStorage while editing. If localStorage is full or cleared:

- Export your deck immediately
- Clear old or test decks
- Import again

---

## Next Steps

Once you've created and exported a deck:

1. Move the `.flux` file to `server/data/decks/`
2. Start the server with `DECK_PATH=data/decks/your-deck.flux npm run dev --prefix server`
3. Press HOST on the home page and create a room
4. Your deck will be loaded and playable

For more details on the deck JSON schema, see [Deck Schema](/guide/deck-schema).
