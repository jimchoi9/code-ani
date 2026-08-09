# Child Test Mode Design

## Activation

`?test=1` enables test mode. Test mode always resolves the visual-novel renderer and suppresses the comparison menu. Normal URLs preserve all existing variants and behavior.

## Participant Session

The visual-novel setup form adds a required participant code separate from the child's story name. Codes are normalized to uppercase and limited to letters, numbers, `_`, and `-`. No real name is required. Starting a participant clears the prior story session, creates a fresh story run, and creates a fresh test record. Reload restores an active participant and story position. The facilitator reset action clears both stores and returns to setup.

## Event Record

A separate local test store records `test_started`, `scene_viewed`, `choice_selected`, `vocabulary_opened`, `ending_reached`, `story_replayed`, and `test_completed`. Each event includes participant code, UI id, UTC timestamp, elapsed milliseconds, scene id, and action-specific data. Story content and test telemetry remain separate.

The facilitator panel exposes the active code, event count, JSON download, and reset. Download includes the participant record, events, and a snapshot of the story session.

## Ending Flow

Test-mode endings show `다른 결말 보러 가기` and `오늘은 여기까지`. Replay preserves participant events and collected endings, creates a new story run, and returns directly to the opening choice scene. Completion records the event and disables the completion control.

## Constraints

- Test mode only; normal demos remain unchanged.
- No backend, account, or personally identifying data.
- Touch targets remain at least 44px.
- Reload and storage failure fall back safely.
