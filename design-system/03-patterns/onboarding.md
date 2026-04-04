# Onboarding

## Principle: Value in Seconds

Understanding value = instant (first view).
Experiencing value = seconds to minutes (not hours or days).

---

## First-Run Flow

```
Landing → Select cancer type → See personalized preview → Sign up (optional) → Upload OR ask
```

**Critical**: The user must experience value BEFORE creating an account. Account creation is a friction point — delay it until they've already invested.

---

## Activation Steps

What "activated" means per profile:

| Profile | Activation Moment | Time Target |
|---------|------------------|-------------|
| **Newly Diagnosed** | Sees their personalized test checklist | < 2 minutes |
| **Treatment-Stage** | Gets answer to a specific question | < 3 minutes |
| **Recurrent/Advanced** | Sees matched clinical trials | < 3 minutes |
| **Caregiver** | Shares a result with care circle | < 5 minutes |

---

## GettingStartedChecklist

Post-signup onboarding checklist. Shows 3-5 key actions.

```
[ ] Complete your profile (cancer type, stage)
[ ] Upload your first record
[ ] Ask your first question
[ ] Invite a caregiver
```

### Design
- Persistent on home page until all items complete
- Checkmarks in green on completion
- Current step highlighted (not in orange — use subtle background)
- Collapsible after first completion
- Progress: "2 of 4 complete"

---

## MicroIntakeModal

Lightweight, non-blocking profile completion. Appears contextually.

- Triggered when user tries a feature that needs profile data
- One question at a time (progressive)
- Can be dismissed and resumed later
- Stores partial progress in localStorage

---

## Progressive Profile Building

Don't ask for everything at signup. Collect data as it becomes relevant:

| Data | When to Ask | Why |
|------|------------|-----|
| Cancer type | First interaction | Core personalization |
| Stage | When showing checklist | Determines which tests |
| Treatment status | When showing questions | Contextualizes answers |
| Email | After showing value | Lead capture |
| Name | At signup | Account creation |
| Caregiver info | After first value delivery | Expansion |

---

## Value Previews

Before asking the user to do something, show them what they'll get:

- Before upload: "See what tests you might be missing"
- Before signup: "Get your personalized checklist"
- Before payment: Show the free checklist, then show what expert review adds

**Pattern**: Partial reveal → "Get the full version by [action]"

---

## Rules

1. **Value before account.** Never require signup to experience value.
2. **2-minute activation target.** If it takes longer, simplify the flow.
3. **Progressive data collection.** Ask only what's needed NOW.
4. **Preview what they'll get.** Before every ask, show the reward.
5. **Checklist over tutorial.** Actionable steps, not passive walkthrough.
6. **localStorage for partial progress.** Never lose user data to a page refresh.
