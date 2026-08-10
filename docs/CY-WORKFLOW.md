# Scout & Steward — Cy Workflow

**Status:** Planning baseline
**Purpose:** Define the client-facing workflow, business rules, and governing experience principles for Cy's use of the Scout & Steward Portal.

> This document describes what happens.
> It does not prescribe how the software must implement it.

---

## How to Read This Document

- `[ BUTTON ]` = something Cy can choose
- `→` = continue
- `◇` = decision
- `✓` = work complete
- `○` = work remains
- `⏱` = work is on hold
- `↗ MARK` = the next action belongs to Mark

The Portal uses ordinary user-facing language. Internal terms such as Canon, D1, publication, schema, Tier 1, and Tier 2 are not exposed unless they genuinely help the user.

---

# 1. Arrival & First Use

## 1.1 Open Scout & Steward

Cy opens the Portal.

◇ **Is this Cy's first visit?**

**YES** → Show First-Use Introduction
**NO** → Go directly to **Home / Your Desk**

## 1.2 First-Use Introduction

Keep the introduction brief: no more than three steps.

### Step 1 — Your Desk

Scout & Steward keeps the cards that need your attention in one place.

`[ NEXT ]`

### Step 2 — Make a Call

For each card, you can:

`[ APPROVE ]` `[ REVISE ]` `[ HOLD ]`

You can review cards one at a time or work with several at once.

`[ NEXT ]`

### Step 3 — You're Ready

Nothing you send to Mark changes the master inventory automatically.

You can review the work before it becomes final.

`[ GO TO MY DESK ]`

## 1.3 First-Use Rules

- The introduction appears automatically on first use.
- Cy may skip it.
- Cy may replay it later from Help or Settings.
- Instructions use plain language and visual demonstration where useful.
- Do not require configuration before work can begin.
- Do not teach technical architecture.
- Consequential actions are never hidden behind unfamiliar gestures.
- Optional capability reveals itself progressively.
- The default experience must be sufficient for Cy to work without assistance from Mark.

---

# 2. Home / Your Desk

## 2.1 Your Desk

After arrival, Cy sees the work that currently belongs to him.

The greeting follows local time:

**Good morning, Cy.**
**Good afternoon, Cy.**
**Good evening, Cy.**

## 2.2 Work Summary

Show a compact accounting of current workflow:

```text
YOUR DESK

Ready now ................ 24
On Hold ..................  4
With Mark ................  3
                           ──
In progress .............. 31

Waiting .................. 82
```

Definitions:

- **Ready now** — Cy can act on these now.
- **On Hold** — Cy deliberately postponed these.
- **With Mark** — Cy handed the next action to Mark.
- **In progress** — total unresolved work already in motion.
- **Waiting** — eligible work not yet placed on Cy's active desk.

These numbers describe workflow status, not sales performance.

## 2.3 Progress

Show progress through the current finite review assignment:

```text
CURRENT REVIEW

████████████░░░░░░░░

32 of 50 reviewed
18 remaining
```

Cards remain members of their original batch when they are On Hold, With Mark, or awaiting another workflow step.

If Cy has completed everything currently available to him while other work remains elsewhere:

> **Your part is done for now.**

Do not falsely describe the entire batch as complete.

Briefly celebrate useful milestones such as 25, 50, 100, and subsequent meaningful increments. Celebration never blocks the next action.

## 2.4 Begin Review

If work is Ready now:

`[ REVIEW ONE ]` `[ REVIEW BULK ]`

- **Review One** → Open the next Ready action.
- **Review Bulk** → Open the Ready set with selection controls.

If no work is Ready:

```text
YOUR DESK IS CLEAR

Nothing needs your attention right now.
```

Cy may still browse Inventory.

## 2.5 Work Priority

Default ordering emphasizes what is new and actionable now.

Age may appear as secondary context, but age alone does not imply danger, failure, or urgency.

Upstream errors, incomplete publications, synchronization problems, or uncertain data must not create Actions for Cy. Uncertain work remains on Mark's side until it is ready.

## 2.6 Home Rules

- Counts come from validated workflow records.
- Do not show phantom or unavailable Actions.
- Do not use red simply because an Action is old.
- Color is never the only carrier of state.
- Cy may enter Inventory without disturbing review progress.
- Returning Home does not discard saved decisions, comments, Holds, or valid selections.

---

# 3. Review One

## 3.1 Default Review

Review One is deliberately quiet:

```text
12 / 25

GENE WASHINGTON

        [ CARD FRONT ]

           [ FLIP ]

Gene Washington
1971 Topps Football Pin-Ups
#23

Recommended Price
$14.00

[ WHY THIS PRICE? ]

[ APPROVE $14 ]  [ REVISE ]  [ HOLD ]
```

The card and the decision are primary. Analytical detail remains available but does not dominate the first view.

## 3.2 Serial Review

Review One is serial by default:

```text
Decision
   ↓
Saved
   ↓
Brief acknowledgment
   ↓
Next Ready card
```

Cy is not returned Home after every decision.

He may leave the sequence at any time.

## 3.3 Approve

For an initial pricing Action:

`[ APPROVE $14 ]`

records acceptance of the recommended business value.

This is an internal **Tier 1 approval**.

The user-facing interface simply says **Approve**.

## 3.4 Revise

`[ REVISE ]`

asks what needs attention:

`[ PRICE ]` `[ LISTING ]` `[ DESCRIPTION ]` `[ CARD INFORMATION ]` `[ OTHER ]`

The taxonomy blossoms in response to Cy's selection.

Cy may provide structured specifics and/or an optional comment. He is never required to write a narrative.

A revision that belongs to Mark creates a **Mark To-Do**.

## 3.5 Hold

`[ HOLD ]`

offers:

`[ 12 HOURS ]` `[ 1 DAY ]` `[ 2 DAYS ]` `[ 1 WEEK ]`

The Action leaves Ready now and returns when the Hold expires.

## 3.6 Approval Vocabulary

Internal approval stage and actor are separate facts.

Example:

```text
approval_stage: tier_1
actor: cy
```

A later approval of Mark's resolved proposal may be:

```text
approval_stage: tier_2
actor: cy
resolved_by: mark
```

Tier terminology is plumbing language, not Cy-facing copy.

---

# 4. Review Bulk

## 4.1 Enter Bulk Review

Bulk Review preserves the familiar inventory-list experience.

```text
[ REVIEW BULK ]
       ↓
Current Ready batch
       ↓
Selection controls ON
```

Nothing is selected automatically.

A sticky control shows:

```text
0 selected · Select All
```

and, after selection:

```text
7 selected · Clear
```

## 4.2 Select Versus Inspect

- Tap the selector → select/unselect.
- Tap the card → inspect Card Detail without losing selection.
- Returning from Card Detail restores the selection context.
- Selection Mode may be disabled for normal browsing and re-enabled without casually destroying still-valid selections.

## 4.3 Bulk Action Tray

Once at least one eligible card is selected:

```text
7 SELECTED

[ APPROVE ]   [ HOLD ]   [ MORE ▾ ]
```

Less-frequent operations live under **More**.

## 4.4 Confirmation Stage

Bulk actions use two stages: select first, then confirm the operation.

Example:

```text
APPROVE RECOMMENDED PRICES

Gene Washington ........ $14.00
Jerry LeVias ............ $12.00
Joe Whoever ............. $16.00
                         ───────
7 cards selected

[ APPROVE 7 CARDS ]

‹ Add or remove cards
```

The confirmation screen should read like an elegant math problem: clear quantities, values, and scope.

The chicken exit — **Add or remove cards** — always returns to selection without losing it.

## 4.5 Bulk Eligibility

Bulk tools remove repetition, not judgment.

- **Approve** is available when every selected item is eligible.
- **Hold** may apply one duration to the selected set.
- **Revise** is offered only when the same requested operation sensibly applies to the group.
- Materially different consequences push work back toward Review One.

## 4.6 After Completion

After a successful operation:

> **7 approved ✓**

Stay in Bulk Review if Ready work remains.

If no Ready work remains:

> **Your part is done for now.**

`[ RETURN TO MY DESK ]` `[ BROWSE INVENTORY ]`

## 4.7 Bulk Safeguards

- Search/filter changes disclose when selected cards are hidden.
- Clear Selection is always available.
- Newly loaded cards are never silently added to an existing selection.
- Select All clearly states its scope.
- Failed operations identify affected cards.
- Cards that become ineligible are safely excluded before confirmation.
- Confirmation uses the latest trusted workflow state.
- One bulk gesture still creates individual business records for each affected card.

## 4.8 Dragging

Dragging is not required for Bulk MVP.

Checkbox/select + action tray is the dependable baseline.

If dragging is later offered, it must meet the motion and responsiveness standards in Section 10. Poor drag interaction does not ship.

---

# 5. Revise / Mark To-Do

## 5.1 Create a Mark To-Do

Cy selects **Revise** and identifies the area:

```text
What needs attention?

[ PRICE ]
[ LISTING ]
[ DESCRIPTION ]
[ CARD INFORMATION ]
[ SOMETHING ELSE ]
```

Structured follow-up appears only where useful.

Example:

```text
What looks wrong?

[ PLAYER ] [ TEAM ] [ YEAR ] [ SET ] [ CARD # ] [ OTHER ]
```

Comment is optional.

`[ SEND TO MARK ]`

## 5.2 The Potato Changes Hands

After the request is successfully saved:

> **Sent to Mark ✓**

State changes:

**Ready for Cy → With Mark**

Cy's part is done for now.

Card Detail gets a small status flag:

`● With Mark`

The flag communicates that something is happening without turning Card Detail into an issue tracker.

## 5.3 Mark's Workspace

Mark receives a queue such as:

```text
MARK TO-DO

Needs attention ........ 3
Waiting on Cy .......... 2
Completed today ........ 7
```

Opening one preserves the published value:

```text
GENE WASHINGTON

Cy flagged:
Team

PUBLISHED
San Francisco 49ers

[ PROPOSE CHANGE ]
[ COMMENT ]
[ NO CHANGE NEEDED ]
```

The original value remains visible while the issue is resolved.

## 5.4 Mark Proposes a Resolution

Example:

```text
TEAM

Published:
San Francisco 49ers

Proposed:
Washington Redskins

Optional note:
[                         ]

[ SEND TO CY ]
```

The proposal is stored separately from the current trusted value.

The potato returns to Cy:

**With Mark → Ready for Cy**

## 5.5 Tier 2 Approval

Cy sees:

```text
MARK'S PROPOSED CHANGE

Team

San Francisco 49ers
        ↓
Washington Redskins

[ APPROVE CHANGE ]
[ SEND BACK ]
```

This is internally **Tier 2 approval**.

Approval makes the proposed change eligible for the validation/application pipeline. It does not directly rewrite Canon.

## 5.6 Auto-Approve Eligible Mark Work

Cy may intentionally enable:

> **Automatically approve eligible changes Mark completes**

When enabled, eligible Mark resolutions may receive Tier 2 approval under Cy's saved preference.

The approval event is still recorded, including that it occurred automatically under the preference.

The preference is reversible.

## 5.7 No Change Needed

Mark may conclude that the current value is already correct.

He selects:

`[ NO CHANGE NEEDED ]`

and may provide an explanation.

Cy receives:

```text
MARK REVIEWED THIS

No change recommended.

[ LOOKS GOOD ]
[ SEND BACK ]
```

Mark does not silently close Cy's concern.

## 5.8 Comments

Each To-Do may contain an optional chronological comment thread, but comments remain subordinate to structured workflow events.

Scout & Steward is not a chat application.

The primary question remains:

> **Who has the potato, and what must that person do next?**

## 5.9 Internal Naming

**Mark To-Do** is useful user-facing language.

Internally, use a person-agnostic concept such as:

```text
resolution_request
assigned_to = mark
```

---

# 6. Inventory / Search / Card Detail

## 6.1 Purpose

**Your Desk** answers:

> What needs my decision?

**Inventory** answers:

> What do I own, and what do I want to investigate?

Inventory is not itself a work queue.

## 6.2 Inventory

```text
INVENTORY

113 cards

[ 🔎 Search inventory                    ]

[ FILTERS ]     [ SORT ▾ ]
```

The existing list/card treatment remains the foundation.

## 6.3 Search Belongs to Inventory

Search is a tool within Inventory, not a separate primary destination.

The search bar remains readily available while browsing. After substantial downward scrolling, useful controls reappear when the user scrolls upward a few pixels.

The experience should resemble a high-end retail catalog, not a database query builder.

## 6.4 Search Behavior

Default search is forgiving across useful identity fields such as:

- player;
- team;
- set;
- year;
- manufacturer;
- card number.

Partial matches are allowed. Ordinary punctuation and capitalization differences do not matter.

Advanced conventions may progressively appear:

```text
washington
"gene washington"
team:washington
-team:49ers
year:1971
```

Cy never needs syntax to search successfully.

## 6.5 Filters — Removable Patches

Filters behave like visible removable patches:

```text
[ Football × ] [ 1971 × ] [ In Progress × ]
```

`[ CLEAR FILTERS ]` appears when useful.

The visual language may gently borrow from service ribbons or badges arranged in a handsome felt/velvet case, without implying military hierarchy.

Frequently used filters may become easier to reach, but core geography remains stable. Personalization shortens paths; it does not rearrange the store.

## 6.6 Sort

Sort remains separate from Filter.

Useful options may include:

- Recently added
- Player A–Z
- Year
- Price
- Recently updated
- Needs attention, when relevant

The current sort is always visible.

## 6.7 Card Detail

Tapping a card opens its full record.

When no price action is pending:

```text
‹ INVENTORY

GENE WASHINGTON

       [ CARD FRONT ]

         [ FLIP ]

Gene Washington
Washington Redskins

1971
Topps
Football Pin-Ups
#23

Price
$14.00
Approved 08/10/26 · CYS

[ PRICE INSIGHTS ]

────────────────────

○ No action needed
```

The card image is the visual anchor.

Cy can view front/back, enlarge the image, and return without losing Inventory search/filter state.

### Price Display Rule

The price label reflects workflow state.

**Awaiting initial review:**

```text
Recommended Price
$14.00

[ WHY THIS PRICE? ]

[ APPROVE ] [ REVISE ] [ HOLD ]
```

**Approved with no price action pending:**

```text
Price
$14.00
Approved 08/10/26 · CYS

[ PRICE INSIGHTS ]
```

**New price change pending:**

```text
Current Price
$14.00

Proposed Price
$18.00

● Awaiting Cy
```

Display initials are presentation. Actor identity is stored separately.

## 6.8 Current Versus Proposed Information

The current published trusted value is visually primary.

Pending proposed values receive distinctive treatment and never masquerade as current canonical values.

Once a validated canonical update returns through a new publication, the normal record reflects the updated value.

## 6.9 Maintenance Flag

Cards with active workflow receive a small status indicator:

```text
● With Mark
● Waiting for you
⏱ On Hold
```

Tapping the flag blossoms into more detail.

## 6.10 Maintenance History

History records meaningful business events:

```text
CARD HISTORY

08 AUG 2026

2214   Price approved
       Cy · $14.00

09 AUG 2026

2118   Update requested
       Cy · Team

2142   Change proposed
       Mark
       49ers → Redskins

2147   Change approved
       Cy
```

Twenty-four-hour time may be used as restrained service-record flavor.

History does not include ordinary UX telemetry.

## 6.11 Initiating Work from Inventory

From an eligible card:

`[ REQUEST A CHANGE ]`

uses the same Mark To-Do workflow defined in Section 5.

There is one workflow with multiple entrances.

## 6.12 Disposition

Maintenance eligibility follows disposition.

- **Available** → normal changes allowed.
- **In Progress / Listed** → changes allowed according to workflow rules.
- **Sold** → historical record; no ordinary listing-edit request.
- **Archived** → historical record; no ordinary listing-edit request.

Sold and archived cards remain searchable and inspectable.

---

# 7. Pricing Recommendations, Evidence & Receipts

## 7.1 Recommendation

When price review is required:

```text
RECOMMENDED PRICE

$14.00

[ CONDITION ↑ ]  [ DEMAND ↑ ]
[ SATURATION ↓↓ ] [ AGE ↓ ]

[ WHY THIS PRICE? ]

[ APPROVE $14 ]  [ REVISE ]  [ HOLD ]
```

The recommendation is primary. Factors explain what pushed it up or down.

## 7.2 Factors

Potential factors include:

- Condition
- Age
- Demand
- Supply
- Market saturation
- Comparable listings
- Recent sales
- Player/subject interest
- Set/insert interest

Only factors actually used are displayed.

## 7.3 Factor Lozenges

Example:

```text
[ CONDITION ↑↑ ]
[ DEMAND ↑ ]
[ SATURATION ↓↓ ]
[ 127 SIMILAR ACTIVE ↓ ]
```

Each communicates:

- **Label** — what was considered.
- **Direction** — upward/downward pressure.
- **Strength** — approximate influence.

Color reinforces direction and strength but never carries meaning alone.

## 7.4 Why This Price?

```text
WHY $14?

CONDITION ↑
The card appears to be in stronger condition
than many comparable examples.

DEMAND ↑
Similar cards are receiving regular buyer interest.

SATURATION ↓↓
127 similar active listings were retrieved.
42 were considered sufficiently similar for pricing context.

RECENT SALES →
Recent comparable sales support a price near this range.

Recommended range
$12–$16

Scout & Steward
$14

[ MARKET DETAILS ]
```

Start with the conclusion, then evidence, then the nerd drawer.

## 7.5 Market Details

Market Details may include:

```text
MARKET DETAILS

Active listings retrieved ...... 127
Sufficiently similar ............ 42
Recent sales considered ......... 18
Observed asking range ....... $9–$24
Observed sold range ....... $11–$17
Recommendation ................. $14

Market checked
10 AUG 2026 · 0927

[ SOURCES & CONFIDENCE ]
```

Do not imply that asking price equals market value.

If automated analysis determines similarity, say so.

## 7.6 Sources & Confidence

Every recommendation provides access to its receipts.

```text
SOURCES & CONFIDENCE

Recommendation created
10 AUG 2026 · 0932

Market data checked
10 AUG 2026 · 0927

Sources referenced
• eBay active listings — 127 retrieved
• eBay sold/completed listings — 18 useful comparisons
• Scout & Steward card record
• Published card condition observations

Confidence
Moderate

This price is an estimate based on available
market and card data. Market prices change,
and automated analysis can make mistakes.

Use your judgment when something doesn't
look right.

[ VIEW SOURCE DETAILS ]
[ REPORT SOMETHING ODD ]
```

**Report Something Odd** uses the existing Mark To-Do workflow.

## 7.7 Source Details

Where practical, preserve:

- source name;
- retrieval timestamp;
- query/search criteria;
- records retrieved;
- records actually used;
- observed asking/sold ranges;
- relevant card fields;
- Portal publication or canonical source version;
- pricing method/version;
- whether automated similarity assessment was used.

A source that cannot later be re-opened should still leave enough preserved evidence to explain what was used at recommendation time.

## 7.8 Evidence Quality

Distinguish:

- **Known evidence** — reliable enough to influence the recommendation.
- **Weak evidence** — useful but uncertain.
- **Unavailable evidence** — not obtained or not trustworthy enough to use.

Missing data never becomes invented certainty.

## 7.9 Recommendation Provenance

A recommendation is a **proposal with a receipt**.

Preserve together:

```text
amount
created_at
market_checked_at
method_version
factors
source/evidence references
confidence/quality
source publication/version
```

Later explanations derive from the preserved recommendation record, not a newly generated AI story about why the system probably chose $14.

## 7.10 AI's Role

AI may assist with interpreting evidence and producing a recommendation.

AI is not the authority merely because it produced a number.

```text
MARKET + CARD DATA
        ↓
PRICING METHOD
        ↓
RECOMMENDATION + RECEIPTS
        ↓
CY
        ↓
Approve / Revise / Hold
```

Cy's domain judgment is intentionally part of the system.

## 7.11 Revise Price

Cy may supply a price without explaining himself.

```text
YOUR PRICE

$ [ 18.00 ]

Comment — optional
[                         ]

Scout & Steward recommended $14

[ USE $18 ]
```

An optional comment is useful data, not a requirement.

## 7.12 Approved Price

After approval, the normal Card Detail language becomes:

```text
Price
$14.00
Approved 08/10/26 · CYS

[ PRICE INSIGHTS ]
```

The original recommendation and receipts remain available through history.

## 7.13 New Market Information

New evidence never silently replaces an approved price.

If new evidence merits review:

```text
CURRENT PRICE
$14

NEW RECOMMENDATION
$18

Market conditions have changed.

[ REVIEW PRICE ]
```

This creates a new Action.

---

# 8. Holds & Returning Work

## 8.1 Hold Choices

Initial choices are quantities rather than a date/time picker:

`[ 12 HOURS ]` `[ 1 DAY ]` `[ 2 DAYS ]` `[ 1 WEEK ]`

## 8.2 Hold State

```text
READY NOW
    ↓
ON HOLD
```

Record the Action, actor, Hold start, selected duration, return time, and consecutive-Hold count.

Holding does not count as completion.

## 8.3 Hold Expiration

At expiration:

```text
ON HOLD
   ↓
READY NOW
```

Counts update accordingly.

## 8.4 Consecutive Holds

After two consecutive Holds:

```text
You've held this one twice.

[ 12 HOURS ]
[ 1 DAY ]
[ 2 DAYS ]
[ 1 WEEK ]

□ Don't mention this again
```

No warning color, guilt, or overdue language.

After a third consecutive Hold, the Portal may offer:

```text
Want to get this one off your desk?

[ SEND TO MARK ]
[ HOLD AGAIN ]

□ Don't suggest this again
```

This is an offer, never automatic reassignment.

The system supplies memory rather than discipline.

---

# 9. Notifications & Return-to-Desk Behavior

## 9.1 Principle

> **The Portal is the source of truth. Notifications are doorbells.**

External notification never becomes the workflow itself.

## 9.2 Notify When Actionable

Useful notifications include:

- the potato changes hands;
- a Hold expires;
- Mark resolves work requiring Cy's attention;
- an explicitly requested reminder is due.

Do not notify merely because a card was viewed, automation succeeded, a batch grew, or an item became old.

## 9.3 Save First, Notify Second

For a Mark To-Do:

```text
Save request
    ↓
Update workflow
    ↓
Success
    ↓
Attempt notification
```

If notification fails, the To-Do still exists.

## 9.4 Mark Returns Work

If Tier 2 approval is required:

```text
Scout & Steward

Mark finished a change for
Gene Washington.

Ready for your review.

[ REVIEW ]
```

If eligible auto-approval is enabled, do not send an unnecessary review notification.

## 9.5 Hold Reminder

If enabled:

```text
Scout & Steward

Your held card is ready again.

Gene Washington
Price review · $14

[ REVIEW ]
```

Without external notification, the Action simply returns to Ready now.

## 9.6 Notification Preferences

Initial preferences may include:

```text
Mark finished something for me     ON
My Hold is ready again             ON
Milestones                         ON

Notification method
○ Portal only
○ Email
○ Text
```

The exact external channel is an implementation decision.

Do not expose providers, APIs, webhooks, or delivery machinery.

## 9.7 Timing

Non-urgent notifications respect reasonable local waking periods.

Workflow state and notification delivery time are separate facts.

## 9.8 Deep Linking

Opening a notification goes directly to the relevant Action.

After completion:

```text
DECISION SAVED ✓
       ↓
More Ready work?
   ↙          ↘
 YES          NO
  ↓            ↓
Next Action   Your part is
              done for now
```

Cy can always return to My Desk.

## 9.9 Notification History

Business events belong in Card History.

Routine delivery/open logs do not.

Operational notification logs may exist for troubleshooting outside the collectible's normal history.

---

# 10. Settings, Help, Feedback & Delight

## 10.1 Settings Philosophy

Settings begin small.

The default experience works without configuration.

Settings answer:

> **How do you want Scout & Steward to behave around you?**

They do not turn Cy into a system administrator.

## 10.2 Initial Settings

```text
SETTINGS

EXPERIENCE

Appearance
○ Standard
○ Dark

Card motion
○ Subtle
○ Playful
○ Reduced

Sound effects
[ ON / OFF ]

Haptics
[ ON / OFF ]


WORKFLOW

Hold reminders
[ ON / OFF ]

Suggest Mark after repeated Holds
[ ON / OFF ]

Automatically approve eligible
changes completed by Mark
[ ON / OFF ]


NOTIFICATIONS

Mark finished something for me
[ ON / OFF ]

My Hold is ready again
[ ON / OFF ]

Milestones
[ ON / OFF ]


HELP

[ HOW SCOUT & STEWARD WORKS ]
[ REPLAY INTRODUCTION ]
```

## 10.3 Appearance

Standard mode uses the established Scout & Steward visual language.

Dark mode may lean into oxblood, deep tobacco, warm near-black, ivory typography, and restrained metallic/parchment accents.

Dark mode should feel like **the library after dinner**, not a mechanical inversion of the standard theme.

## 10.4 Motion

**Functional motion is not optional. Decorative motion is.**

All modes retain polished physical continuity: responsive scrolling, immediate touch response, clean expansion/collapse, smooth settling, and transitions that preserve spatial context.

### Subtle — default

Elegant functional transitions with restrained feedback.

### Playful

The same responsiveness plus more expressive card physics and celebratory flourishes.

### Reduced

Remove nonessential movement and minimize transitions while preserving immediate, polished state changes and spatial clarity.

### Gesture Quality Rule

> **Gestures must feel physically responsive or they do not ship. Animation may be restrained; interaction quality may not be.**

If a drag gesture cannot reliably feel attached to the user's finger and settle confidently into its destination, use dependable tap controls instead.

No interaction should resemble dragging a lagging paint window across an overheated 1990s PC.

## 10.5 Sound & Haptics

Optional sound/haptics may reinforce successful actions.

Avoid alarms for ordinary work, repeated bulk noises, arcade-machine sound, or surprise audio.

A 25-card bulk approval produces one acknowledgment, not 25.

## 10.6 Help

Help is task-oriented:

- Review a card
- Change a price
- Send something to Mark
- Put something on Hold
- Find a card
- See what changed
- Understand a price

Contextual help appears where questions arise.

## 10.7 Experience Check-Ins

Occasionally ask about an interaction after Cy has enough experience to judge it.

Example:

```text
QUICK QUESTION

You've reviewed a few cards this way.

How easy was that?

😕    😐    🙂    😄

[ NOT NOW ]
```

Use 3–4 choices maximum.

Ask about specific interactions, not generic satisfaction.

Do not interrupt bulk work, errors, or disputed-change resolution.

Repeated dismissal reduces future prompting.

## 10.8 Consent & Telemetry

Optional product-usage telemetry requires clear ordinary-language consent.

Declining does not reduce core functionality.

Collect only telemetry with a defined product-design purpose, such as:

```text
bulk_review_started
bulk_action_completed
hold_used
price_insights_opened
search_returned_no_results
experience_rating_submitted
```

Do not build a permanent dossier of every tap, scroll, card view, pause, typing correction, or navigation choice.

Business history is durable. Product telemetry is separate, optional, and restrained.

## 10.9 Search Improvement

Scout & Steward may learn from Scout & Steward search failures.

Example:

```text
Search:
"washinton"

No exact result

Possible match:
Washington

[ SHOW RESULTS ]
```

Do not harvest Cy's phone keyboard history, personal dictionary, or unrelated typing behavior.

## 10.10 Milestones & Personality

Delight acknowledges accomplishment without demanding continued engagement.

Examples:

```text
25 reviewed

A good day's work.
```

```text
50 reviewed

Half a hundred.
```

```text
100 reviewed

100 cards cleared.

Carry on, Colonel.
```

Military slang, classic Western flavor, card-table language, and familiar movie culture may appear occasionally.

Scout & Steward should sound like it knows Cy. It should not sound like it is doing an impression of Cy.

No streaks. No daily goals. No guilt.

## 10.11 Calm Status Language

Prefer:

- Ready for you
- With Mark
- On Hold
- Approved
- Change proposed
- No action needed

Reserve alarming terms such as Critical, Failed, Warning, or Urgent for conditions that genuinely warrant them.

## 10.12 Errors

Tell Cy:

1. what happened;
2. whether his work was saved;
3. what he can do next.

Example:

```text
WE COULDN'T LOAD THE NEXT CARD

Your last approval was saved.

[ TRY AGAIN ]
[ RETURN TO MY DESK ]
```

Do not expose infrastructure errors.

Only claim Mark has been notified when the system can establish that notification/escalation occurred.

## 10.13 Accessibility

Accessibility is normal product quality.

Support:

- comfortable touch targets;
- readable default type;
- strong contrast;
- text labels in addition to color;
- keyboard navigation where applicable;
- visible focus states;
- reduced motion;
- semantic controls;
- screen-reader-friendly status changes;
- device/browser text scaling.

Favor recognition over recall.

## 10.14 Progressive Disclosure

Scout & Steward begins simple:

```text
FIRST VISIT

Approve
Revise
Hold
Inventory

        ↓ curiosity / experience

Price Insights
Filters
History
Bulk tools

        ↓ further use

Advanced search
Market details
Preferences
Additional workflow tools
```

Features may blossom and unfurl.

**The application's fundamental geography does not move.**

---

# Appendix A — End-to-End Flow

```text
FIRST VISIT
    ↓
Brief introduction
    ↓
YOUR DESK
    │
    ├─────────────── INVENTORY
    │                    │
    │                    ├─ Search / Filter / Sort
    │                    ├─ Card Detail
    │                    ├─ Price Insights
    │                    ├─ History
    │                    └─ Request a Change ───────┐
    │                                               │
    ▼                                               │
READY ACTIONS                                       │
    │                                               │
    ├─ REVIEW ONE                                   │
    │                                               │
    └─ REVIEW BULK                                  │
            │                                       │
            ▼                                       │
      CY DECISION                                   │
       ↙    ↓    ↘                                  │
 APPROVE  HOLD  REVISE ◄────────────────────────────┘
    │      │       │
    │      │       ▼
    │      │    MARK TO-DO
    │      │       │
    │      │       ▼
    │      │    MARK RESOLVES
    │      │       │
    │      │       ▼
    │      │    PROPOSAL
    │      │       │
    │      │       ▼
    │      │    TIER 2 APPROVAL
    │      │       │
    │      │       ▼
    │      │    VALIDATION /
    │      │    CANON PIPELINE
    │      │
    │      └────► READY LATER
    │
    ▼
DECISION RECORDED
    │
    ▼
NEXT READY ACTION
```

---

# Appendix B — Workflow States

These names are implementation-facing vocabulary. User-facing copy may differ.

| State | Meaning | Potato |
| --- | --- | --- |
| `WAITING` | Eligible work exists but is not yet on the active desk | System/Mark |
| `READY` | Cy can take the next meaningful action | Cy |
| `ON_HOLD` | Cy deliberately postponed the Action until a known return time | Cy, later |
| `WITH_MARK` | Cy requested resolution and Mark can act next | Mark |
| `AWAITING_CY` | Mark returned a proposal/resolution requiring Cy's decision | Cy |
| `COMPLETED` | The current Action requires no further human workflow step | Nobody |

Typical transitions:

```text
WAITING → READY
READY → COMPLETED
READY → ON_HOLD
ON_HOLD → READY
READY → WITH_MARK
WITH_MARK → AWAITING_CY
AWAITING_CY → COMPLETED
AWAITING_CY → WITH_MARK
```

A completed proposal that requires canonical mutation is still subject to the downstream validation/application pipeline.

---

# Appendix C — Approval Vocabulary

## Tier 1 Approval

Initial acceptance of a business recommendation or proposed value.

Typical example:

> Cy approves the recommended $14 price.

## Tier 2 Approval

Acceptance of a resolution/proposal returned after another person performed investigation or correction.

Typical example:

> Mark proposes Washington Redskins; Cy approves the change.

## Separate Facts

Do not encode approval as one generic boolean.

Preserve:

```text
approval_stage
actor
resolved_by
approved_at
proposal/reference
auto_approved
preference/reference, when applicable
```

The UI uses ordinary verbs rather than Tier terminology.

---

# Appendix D — Governing UX Rules

1. **Show Cy what needs his judgment, not how the machinery works.**
2. **Canon describes the object. Portal describes what humans are doing about it.**
3. **The person who can take the next meaningful action has the potato.**
4. **Friction increases with consequence.**
5. **Bulk tools remove repetition, not judgment.**
6. **Current trusted data and proposed data never masquerade as one another.**
7. **AI recommendations come with receipts.**
8. **Notifications are doorbells; the Portal is the source of truth.**
9. **Business history is durable. Product telemetry is separate, optional, and restrained.**
10. **Reward curiosity with capability rather than confronting Cy with configuration.**
11. **Color reinforces meaning; it does not define meaning.**
12. **Incomplete work is not automatically bad work.**
13. **The interface supplies memory rather than discipline.**
14. **Cy's judgment remains a feature of the system.**
15. **When the software is uncertain, it is modest about being uncertain.**
16. **Functional motion is not optional; decorative motion is.**
17. **Gestures must feel physically responsive or they do not ship.**
18. **The application's fundamental geography does not move.**
