# Game Modes

LocalFlux supports two primary quiz mechanics that can be mixed within a single deck: **Multiple Choice (MCQ)** and **Type Guess**. Hosts can override deck defaults to enforce a specific mode across all questions.

---

## Multiple Choice (Standard)

Presents four answer options to each player. Players select the correct one.

### How It Works

1. **Question Screen**: Host sees question text; players see 4 options labeled A, B, C, D
2. **Answer Window**: Players tap their choice within the time limit
3. **Validation**: Server checks if the selection matches the deck's correct answer
4. **Scoring**: Server computes score with current MCQ runtime logic (time + streak aware)
5. **Reveal**: Host clicks "Reveal" to show the correct answer and updated scores

### When to Use

- Large player groups (80+ players) — faster input, fewer typos
- Classroom settings where consistency is valued
- Trivia covering pop culture, history, geography (topics with objective answers)

### Deck Configuration

Set `type: "text_only"` for MCQ questions in your deck:

```json
{
  "q_id": "q_01",
  "type": "text_only",
  "prompt": "Who won the 2022 World Cup?",
  "options": ["France", "Argentina", "Australia", "England"],
  "correct_answer": "Argentina",
  "time_limit_ms": 15000,
  "fuzzy_allowances": []
}
```

---

## Type Guess (Free Text)

Players type their own answer. The server uses fuzzy matching to validate answers against variants.

### How It Works

1. **Question Screen**: Host sees question; players see a text input field
2. **Answer Window**: Players type their answer and submit
3. **Server Fuzzy Matching**:
   - Normalizes both answer and player input (lowercase, trim whitespace)
   - Checks if player input matches the correct answer exactly
   - If not, checks registered variants/aliases (configurable edit distance)
4. **Validation**: Server sends `correct_answer` to host; host presses "Reveal" to show it to players
5. **Scoring**: Server computes score using difficulty/time/match-quality breakdown
6. **Reveal**: Host and players see the official answer and score update

### When to Use

- Small to medium groups (up to 50 players) — typing scales worse than tapping
- Classroom assessments (spelling, capitals, names)
- Named-entity questions (authors, scientists, historical figures)
- Questions requiring specificity (e.g., "What is the chemical formula for water?")

### Deck Configuration

Set `type: "typing"` and provide answer variants:

```json
{
  "q_id": "q_02",
  "type": "typing",
  "prompt": "What is the capital of France?",
  "correct_answer": "Paris",
  "time_limit_ms": 15000,
  "fuzzy_allowances": ["paris", "Paris France", "paris france"],
  "options": [],
  "asset_ref": null
}
```

### Configuring Fuzzy Matching

By default, the server accepts:
- **Exact match** (e.g., "Paris" → "paris")
- **Registered variants** (e.g., "paris france" if declared in `fuzzy_allowances`)
- **Small typos**: Edit distance up to 1–2 characters (configurable in [config/typeGuessPolicy.js](../../../server/config/typeGuessPolicy.js))

#### Example Variants

| Correct Answer | Variants |
|---|---|
| `Krypton` | small typos: `krypton`, `crypton`, misspellings: `Crypton`, `Kipton` |
| `Harry Potter` | abbreviations: `hp`, `potter`, display variations: `Harry James Potter` |
| `H₂O` | ASCII alternatives: `H2O`, `water` |

---

## Image Guess (Planned)

Show an image and ask players to identify it from four options. Currently in development.

### Planned Features

| Feature | Status |
|---|---|
| Display WebP images alongside questions | In progress |
| Compression and caching | In progress |
| Admin image upload pipeline | Planned |

---

## Host Mode Override (Answer Mode)

Hosts can enforce a single mode for the entire game, overriding deck settings.

### Setting the Mode

1. After creating a room, host sees **Game Mode** selector in the lobby
2. Options:
   - **Auto (Deck-Driven)**: Run questions as authored
   - **Multiple Choice**: All questions run as MCQ
   - **Type Guess**: All questions run as type guess
3. This setting applies to all questions in the current game

### Mode Conversion Matrix

| Deck Setting | Auto | Multiple Choice | Type Guess |
|---|---|---|---|
| **MCQ** | MCQ | MCQ | First option becomes answer |
| **Type Guess** | Type Guess | Auto-generate 3 options | Type Guess |

### When to Force a Mode

- **Force MCQ**: Small groups where you want consistency; mixed decks with some weak Type Guess questions
- **Force Type Guess**: You want more engagement/difficulty; testing recall (not recognition)

---

## Comparing the Modes

| Criterion | MCQ | Type Guess |
|---|---|---|
| **Input method** | Tap/click | Type + submit |
| **Speed** | Fast (tap in <1s) | Slower (type + hit enter) |
| **Accessibility** | Phone-friendly | Mobile keyboards can interfere |
| **Ambiguity** | None (4 choices) | High (variants matter) |
| **Cheating resistance** | Moderate (tap can be guessed) | High (matching required) |
| **Cognitive load** | Recognition | Recall |
| **Scalability** | Excellent (50+) | Good (up to 50) |
| **Scoring** | MCQ legacy runtime scoring | Breakdown scoring engine |

---

## Best Practices

### Building Type Guess Questions

1. **Specificity**: Avoid ambiguous answers
   - ❌ "A color" → "red", "blue", "crimson"...
   - ✅ "The primary color of the French flag at left" → "blue"

2. **Register common aliases**:
   - ❌ `correct_answer: "Pyongyang"`, `variants: []`
   - ✅ `correct_answer: "Pyongyang"`, `variants: ["Pyong Yang", "capital of North Korea"]`

3. **Handle case/spacing**:
   - ❌ `correct_answer: "NewYork"`
   - ✅ `correct_answer: "New York"` (server normalizes to lowercase for matching)

### Building MCQ Questions

1. **Distractor quality**: Make wrong options plausible
   - ❌ Obvious wrong answers (e.g., "What is 2+2?" → "4", "elephant", "guitar", "Jupiter")
   - ✅ Common misconceptions and near-misses

2. **Single correct answer**: Design so exactly one option is defensible
   - ❌ Ambiguous or multiple correct answers
   - ✅ Clear, objective correct option

3. **Option randomization**: Randomize the position of the correct answer
   - ❌ Correct answer always in position C
   - ✅ Correct answer varies across questions

---

## Configuration Files

### Type Guess (typeGuessPolicy.js)

Server-side fuzzy matching configuration:

```javascript
{
   TYPE_GUESS_THRESHOLD: 0.85,
   TYPE_GUESS_POINTS: 100,
   MAX_GUESS_LENGTH: 180
}
```

### Scoring and Validation

MCQ and Type Guess currently use different scoring paths.

- MCQ: legacy positional scoring in `gameEngine`
- Type Guess: object-based `calculateScore` in `typeGuessHandlers`

See [Scoring Engine](/guide/scoring-engine) for details.

---

## Common Questions

### Can I mix MCQ and Type Guess in one deck?

**Yes.** Set different `type` values for different questions. The host can also enforce a single mode in the lobby override.

### Which mode is harder for players?

**Type Guess is harder** because it requires recall (remembering an answer) rather than recognition (picking from options). Use it for advanced/competitive leagues.

### Can I change modes mid-game?

**Not currently.** The mode is set when the host creates the room. To switch modes, end the game and create a new room with a different setting.

### What if a player's answer is close but not exact?

Type Guess uses fuzzy matching:
- If you registered the variant in `fuzzy_allowances`, it's accepted
- If not, matcher score is checked against the active threshold
- If still no match, the answer is marked wrong

### How do I know if my Type Guess questions are good?

Test them:
1. Create a test room
2. Try answering as various creative players would
3. If legitimate answers are rejected, add variants
4. Re-export the deck

---

## See Also

- [Deck Schema](/guide/deck-schema) — Full JSON reference
- [Deck Studio](/guide/deck-studio) — Browser editor for creating decks
- [Architecture](/guide/architecture) — How modes are implemented
