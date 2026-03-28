# LocalFlux Scoring Engine Documentation

## Overview

The LocalFlux scoring engine is a robust utility system for calculating player scores based on:
- **Question Difficulty** (base score)
- **Time Remaining** (bonus points)
- **Answer Accuracy** (exact match, fuzzy match, or wrong)
- **Host Mode** (casual, moderate, or pro)

The new scoring engine replaces inline calculations with a centralized, thoroughly tested `calculateScore()` function.

---

## Mathematical Formula

```
Final Score = Math.floor((Base Score + Time Bonus) × Accuracy Multiplier)
```

### Components

#### 1. Base Score (by Difficulty)
| Difficulty | Points |
|------------|--------|
| `hard`     | 2000   |
| `medium`   | 1500   |
| `easy`     | 1000   |
| undefined/null/unknown | 1000 (default) |

#### 2. Time Bonus
```
Time Bonus = (Time Remaining / Total Time) × 500
```
- **Maximum**: 500 points (when full time remains)
- **Minimum**: 0 points (when time expires or is negative)
- Automatically clamps:
  - Negative `timeRemaining` → 0
  - `timeRemaining` > `totalTime` → capped at 500
  - `totalTime` of 0 → 0 bonus (safety check)

#### 3. Accuracy Multiplier

The multiplier depends on the **Host Mode** and the **answer type**:

##### Casual Mode (Default)
| Answer Type | Multiplier |
|------------|------------|
| Exact Match | 1.0× |
| Fuzzy Match (Typo) | 0.8× |
| Wrong Answer | 0.0× |

##### Moderate Mode
| Answer Type | Multiplier |
|------------|------------|
| Exact Match | 1.0× |
| Fuzzy Match (Typo) | 0.0× (no points) |
| Wrong Answer | 0.0× |

##### Pro Mode
| Answer Type | Multiplier |
|------------|------------|
| Exact Match | 1.25× (bonus) |
| Fuzzy Match (Typo) | 0.0× (no points) |
| Wrong Answer | 0.0× |

---

## Implementation Details

### File: `server/core/scoringEngine.js`

The main scoring engine exports:

```javascript
const { calculateScore } = require('../core/scoringEngine');

const scoreResult = calculateScore({
  difficulty: 'hard',           // Question difficulty
  hostMode: 'casual',           // Host game mode
  timeRemaining: 15000,         // Milliseconds remaining
  totalTime: 20000,             // Total question time in milliseconds
  isExactMatch: true,           // Boolean: exact answer match?
  isFuzzyMatch: false,          // Boolean: fuzzy (typo-tolerant) match?
});

// Returns ScoreBreakdown object:
// {
//   baseScore: 2000,
//   timeBonus: 375,
//   multiplier: 1.0,
//   finalScore: 2375
// }
```

### Type Definitions (JSDoc)

```javascript
/**
 * @typedef {'easy'|'medium'|'hard'|string|null|undefined} Difficulty
 */

/**
 * @typedef {'casual'|'moderate'|'pro'|'arcade'|string|null|undefined} HostMode
 */

/**
 * @typedef {object} CalculateScoreParams
 * @property {Difficulty} difficulty
 * @property {HostMode} hostMode
 * @property {number} timeRemaining
 * @property {number} totalTime
 * @property {boolean} isExactMatch
 * @property {boolean} isFuzzyMatch
 */

/**
 * @typedef {object} ScoreBreakdown
 * @property {number} baseScore
 * @property {number} timeBonus
 * @property {number} multiplier
 * @property {number} finalScore
 */
```

---

## Integration Points

### 1. MCQ Mode Scoring

**File**: `server/core/gameEngine.js` (lines ~100-130)

```javascript
const { calculateScore } = require('./scoringEngine');

function submitAnswer(room, slides, socketId, answer) {
  // ... validation logic ...
  
  if (correct) {
    const player = room.players.find((p) => p.id === socketId);
    if (player) {
      const totalTime = Number(slide?.timeLimit) > 0 ? Number(slide.timeLimit) : 20000;
      const timeRemaining = Math.max(0, (room.currentQEndsAt || Date.now()) - Date.now());

      const scoreResult = calculateScore({
        difficulty: slide?.difficulty,
        hostMode: room?.gameMode || 'casual',
        timeRemaining,
        totalTime,
        isExactMatch: true,
        isFuzzyMatch: false,
      });

      player.score += scoreResult.finalScore;
    }
  }
  
  // ... rest of function ...
}
```

### 2. Type Guess Mode Scoring

**File**: `server/network/typeGuessHandlers.js` (lines ~45-70)

```javascript
const { calculateScore } = require('../core/scoringEngine');

socket.on('player:chat_guess', ({ text } = {}, callback) => {
  // ... validation logic ...
  
  if (validationResult.correct) {
    const timeRemainingMs = Math.max(0, (room.currentQEndsAt || Date.now()) - Date.now());
    const totalTimeMs = Number(currentQ.timeLimit) > 0 ? Number(currentQ.timeLimit) : 20000;
    const isExactMatch = validationResult.matchType === 'exact';
    const isFuzzyMatch = validationResult.matchType === 'fuzzy';

    const scoreResult = calculateScore({
      difficulty: currentQ.difficulty,
      hostMode: gameMode,
      timeRemaining: timeRemainingMs,
      totalTime: totalTimeMs,
      isExactMatch,
      isFuzzyMatch,
    });

    player.score = Number(player.score || 0) + scoreResult.finalScore;
    
    // ... emit score update ...
  }
  
  // ... rest of function ...
});
```

---

## Edge Cases & Robustness

The `calculateScore()` function handles the following edge cases:

| Edge Case | Behavior |
|-----------|----------|
| `timeRemaining < 0` | Clamped to 0 |
| `timeRemaining > totalTime` | Time bonus capped at 500 |
| `totalTime === 0` | Treated as 0 time remaining (division by zero safe) |
| `difficulty` undefined/null | Defaults to 'easy' (1000 points) |
| `hostMode` undefined/null | Defaults to 'casual' |
| Unknown difficulty string | Defaults to 'easy' (1000 points) |
| Unknown host mode | Defaults to 'casual' |
| `isExactMatch` and `isFuzzyMatch` both false | Multiplier = 0.0× (no points) |
| Non-numeric time values | Converted via `Number()` |
| NaN values | Treated as 0 or safely ignored |
| Case-sensitivity | Normalized to lowercase |
| `arcade` mode (legacy) | Aliased to 'moderate' for backward compatibility |

---

## Testing

Comprehensive test suite: `server/tests/scoringEngine.test.js`

### Test Coverage
- ✅ All difficulty levels
- ✅ Time bonus edge cases
- ✅ All host modes (casual, moderate, pro)
- ✅ Answer type scenarios (exact, fuzzy, wrong)
- ✅ Parameter validation and defaults
- ✅ Numeric coercion and edge values
- ✅ Score breakdown consistency

### Running Tests

```bash
npm test -- scoringEngine.test.js
```

### Example Test Cases

```javascript
// Exact match with full time in casual mode
calculateScore({
  difficulty: 'hard',
  hostMode: 'casual',
  timeRemaining: 20000,
  totalTime: 20000,
  isExactMatch: true,
  isFuzzyMatch: false,
});
// Expected: finalScore = 2500 (2000 base + 500 bonus × 1.0)

// Fuzzy match with half time in moderate mode
calculateScore({
  difficulty: 'easy',
  hostMode: 'moderate',
  timeRemaining: 10000,
  totalTime: 20000,
  isExactMatch: false,
  isFuzzyMatch: true,
});
// Expected: finalScore = 0 (fuzzy not allowed in moderate)

// Exact match with bonus in pro mode
calculateScore({
  difficulty: 'medium',
  hostMode: 'pro',
  timeRemaining: 20000,
  totalTime: 20000,
  isExactMatch: true,
  isFuzzyMatch: false,
});
// Expected: finalScore = 3125 (1500 base + 500 bonus × 1.25)
```

---

## Migration Notes

### What Changed?
- **Replaced**: Inline score calculations in multiple files
- **Centralized**: All scoring logic now in `scoringEngine.js`
- **Improved**: Added comprehensive edge case handling
- **Documented**: JSDoc types and test cases

### Files Modified
1. ✅ `server/core/scoringEngine.js` - New robust implementation
2. ✅ `server/core/gameEngine.js` - Uses `calculateScore()` for MCQ
3. ✅ `server/network/typeGuessHandlers.js` - Uses `calculateScore()` for type guess
4. ✅ `server/tests/scoringEngine.test.js` - Comprehensive test suite

### Backward Compatibility
- ✅ Function signature unchanged
- ✅ Return structure consistent
- ✅ All existing integrations work without modification
- ✅ `arcade` mode aliased to `moderate` for legacy support

---

## Performance Implications

The `calculateScore()` function is:
- **Synchronous** (no async operations)
- **Lightweight** (pure computation, no I/O)
- **Fast** (microsecond-level execution)
- **Deterministic** (same input → always same output)
- **Safe** (handles all edge cases)

**Typical execution time**: < 1ms per call

---

## API Reference

### Function: `calculateScore(params)`

**Parameters:**
- `params` (object, optional)
  - `difficulty` (string, optional): 'easy', 'medium', 'hard', or undefined (defaults to 'easy')
  - `hostMode` (string, optional): 'casual', 'moderate', 'pro', or undefined (defaults to 'casual')
  - `timeRemaining` (number, optional): milliseconds remaining on clock
  - `totalTime` (number, optional): total question time in milliseconds
  - `isExactMatch` (boolean, optional): whether answer is exact match
  - `isFuzzyMatch` (boolean, optional): whether answer is fuzzy match (typo-tolerant)

**Returns:**
- `ScoreBreakdown` object:
  - `baseScore` (number): Points from difficulty level
  - `timeBonus` (number): Points from time remaining
  - `multiplier` (number): Accuracy multiplier (0-1.25)
  - `finalScore` (number): Total points awarded (floored integer)

---

## Future Enhancements

Potential improvements for future versions:
- [ ] Streak bonuses for consecutive correct answers
- [ ] Difficulty-based time bonus modifiers
- [ ] Configurable multiplier values per mode
- [ ] Score decay formula for longer rounds
- [ ] Player profile-based handicaps or boosts
- [ ] Real-time score updates via WebSocket
- [ ] Score history and analytics tracking
- [ ] Monthly leaderboards with score multipliers

---

## Questions & Support

For issues or questions about the scoring engine:
1. Check the test cases in `scoringEngine.test.js`
2. Review JSDoc comments in `scoringEngine.js`
3. Check integration points in `gameEngine.js` and `typeGuessHandlers.js`
4. Refer to game design documentation for mode definitions
