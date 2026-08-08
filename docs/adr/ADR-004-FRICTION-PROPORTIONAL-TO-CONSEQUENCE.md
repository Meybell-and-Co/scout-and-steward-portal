
### `docs/adr/ADR-004-friction-proportional-to-consequence.md`

```markdown
# ADR-004 — Friction Proportional to Consequence

## Status

Accepted

---

## Decision

Scout & Steward Portal will intentionally vary interaction friction
according to the consequence of an action.

Frequent, low-risk actions should require minimal effort.

Actions affecting many records, destructive actions, irreversible
actions, or otherwise consequential operations should require greater
demonstration of intent.

The governing principle is:

> Speed for repetition.
>
> Friction for consequence.

---

## Why

Not every confirmation deserves the same interaction.

Adding confirmation dialogs to routine actions creates fatigue and
teaches users to dismiss warnings automatically.

Providing no additional friction for consequential actions makes
accidental changes too easy.

The interface should therefore make common work efficient while making
high-consequence actions deliberately harder to perform accidentally.

Friction should protect the user rather than punish the user.

---

## Interaction Levels

### Routine Actions

Examples may include:

- approving one recommended price
- moving to the next card
- changing filters
- searching inventory
- viewing a card
- switching between front and back images

These actions should generally be immediate.

### Moderate-Consequence Actions

Examples may include:

- approving a modest group of unchanged recommendations
- rejecting a proposed change
- replacing a previously submitted price

These actions may require an explicit confirmation or additional review.

### High-Consequence Actions

Examples may include:

- approving hundreds of records at once
- destructive bulk operations
- actions that would substantially alter workflow state
- irreversible administrative operations

These actions should require deliberate confirmation.

A press-and-hold interaction may be appropriate when sustained intent
provides meaningful protection against accidental activation.

For particularly consequential bulk actions, a hold duration of several
seconds may be used when justified by the risk.

---

## Interaction Requirements

Confirmation mechanisms should:

- clearly state what will happen
- identify the scope of the action when practical
- make accidental activation unlikely
- avoid vague confirmation language
- provide visible progress for sustained interactions
- allow cancellation before completion when practical
- provide clear feedback after completion

A user should not need to infer whether a consequential operation
succeeded.

---

## Progressive Enhancement

Haptic feedback, animation, gestures, and other device capabilities may
reinforce interaction state.

They must not be the sole mechanism communicating an important action.

For example, a completed bulk approval may provide:

- visible completion
- updated record counts
- motion
- optional haptic feedback where supported

The operation remains understandable when haptic feedback is unavailable.

---

## Alternatives Considered

### Confirmation Dialog for Every Change

Rejected.

Excessive confirmation creates friction without meaningfully increasing
safety and encourages habitual dismissal.

### No Confirmation for Bulk Actions

Rejected.

The consequences of accidental bulk operations justify additional
protection.

### Uniform Confirmation Rules

Rejected.

A single interaction pattern does not adequately represent the
difference between approving one card and approving hundreds of cards.

---

## Tradeoffs

### Pros

- keeps routine review fast
- protects consequential operations
- reduces confirmation fatigue
- communicates the relative importance of actions
- makes accidental bulk operations less likely
- supports a more physical and intentional mobile experience

### Cons

- requires designers and developers to evaluate consequence
- introduces multiple confirmation patterns
- high-friction interactions can become annoying if applied too broadly
- sustained interactions require careful accessibility consideration

---

## Accessibility

Press-and-hold interactions must not become the only available mechanism
when doing so would create an accessibility barrier.

Where necessary, an accessible alternative should provide equivalent
intentional confirmation.

Reduced-motion preferences and other relevant device or browser settings
should be respected.

---

## Future Direction

Specific thresholds for moderate- and high-consequence actions may be
established after real-world use.

The architectural principle should remain stable even if individual
interaction thresholds change.
