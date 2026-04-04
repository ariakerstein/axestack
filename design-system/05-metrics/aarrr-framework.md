# AARRR Pirate Metrics

## Current Priority

**Activation → Revenue/Referral**

We need users experiencing value, then either paying or referring. Acquisition comes from ads/content (handled separately). Retention follows from genuine value delivery.

---

## Stages Mapped to Design

### Acquisition (How they find us)
- Landing pages, ad campaigns, organic search
- Design concern: First impression. PCP model. Trust in 2 seconds.
- Key metric: Landing page → CTA click rate
- **Collect**: "How did you hear about us?" (post-signup)

### Activation (First value experience)
**THIS IS THE PRIORITY.**

| Profile | Activated When | Target Time |
|---------|---------------|-------------|
| Newly Diagnosed | Sees personalized test checklist | < 2 min |
| Treatment-Stage | Gets specific questions for their appointment | < 3 min |
| Recurrent/Advanced | Sees matched clinical trials | < 3 min |
| Caregiver | Shares a result with family/doctor | < 5 min |

- Design concern: Remove ALL friction to value. No unnecessary steps.
- Key metric: Time from first interaction to AHA moment
- **Collect**: "What surprised you most?" (post-activation)

### Revenue (They pay)
- Free checklist → Expert review upsell ($199)
- Design concern: Price anchoring ($4K → $199), value demonstration before ask
- Key metric: Free → paid conversion rate
- **Collect**: "What made you decide to get expert review?" / "What almost stopped you?"

### Retention (They come back)
- New results, appointment prep, record updates
- Design concern: Notification relevance, re-engagement value
- Key metric: Weekly active usage, features used per session
- **Collect**: "What brought you back today?" (after 2nd+ session)

### Referral (They tell others)
- Care circle invites, share results, word of mouth
- Design concern: One-tap sharing, shareable result formats
- Key metric: Invites sent, referred signups
- **Collect**: "Would you recommend Navis to someone in your situation? Why/why not?"

---

## Qualitative Over Quantitative

At our stage, **WHY matters more than HOW MANY**.

- Don't optimize conversion rates without understanding conversion reasons
- Every funnel step should have a qualitative feedback point
- See `qualitative-feedback.md` for collection techniques

Typeform-style surveys have great response rates because they feel personal and conversational — one question at a time, just like our wizard flow.

---

## Design Checklist by AARRR Stage

Before building any feature, identify its AARRR stage and check:

### Activation Features
- [ ] Can user experience value without signup?
- [ ] Is time-to-value under 3 minutes?
- [ ] Is the value personalized (not generic)?
- [ ] Is there a clear "wow" moment?
- [ ] Is the next step obvious after the wow?

### Revenue Features
- [ ] Is free value demonstrated BEFORE the ask?
- [ ] Is price anchored against alternatives?
- [ ] Are objections handled inline?
- [ ] Is the payment flow frictionless (inline, not redirect)?
- [ ] Is there a satisfaction signal post-purchase?

### Referral Features
- [ ] Is sharing one tap?
- [ ] Is the shared content valuable to the recipient (not just promotional)?
- [ ] Does the recipient get value without signup?
- [ ] Is there a natural prompt to share (after value delivery)?
