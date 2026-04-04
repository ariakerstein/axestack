# Design System: Opencancer.ai (by Navis)
**Project ID:** [Insert Project ID Here]

## 1. Visual Theme & Atmosphere
**"Airy, Anchored, and Hopeful."** 
The core philosophy of this design system is to act as a "life vest" for the user, transitioning them from a state of overwhelm to confident action. Because the platform handles dense, anxiety-inducing medical data, the UI must be the opposite: breathable, soft, and meticulously structured. We practice "Clarity is Kindness" by utilizing expansive white space, progressive disclosure (hiding scary details until requested), and an exceptionally strict visual hierarchy. The atmosphere is warm and human, yet backed by the sterile precision of medical-grade AI.

## 2. Color Palette & Roles
*Crucial System Rule: The Action Color is completely isolated. It is a functional tool, not a decorative brand color.*

* **Lifeline Magenta (#C026D3)**
  * **Role:** **Strictly Interactive Elements ONLY.** This color is the user's lifeline and represents the "next right step." 
  * **Rule:** It is *never* used for headers, subheaders, icons, or decorative backgrounds. If a user sees this color, they must know with 100% certainty that it is clickable. 
* **Trustworthy Navy (#0F172A)**
  * **Role:** Primary typography and authoritative headers. Replaces pure black to reduce eye strain while maintaining a highly credible, medical-grade tone.
* **Calming Slate (#F8FAFC)**
  * **Role:** Primary app background. A breathable, off-white gray that prevents the harshness of a pure white screen, reducing cognitive fatigue for users in treatment.
* **Soft Lavender Accent (#F3E8FF)**
  * **Role:** Non-clickable brand warmth. Used for highlighting active card states, subtle section dividers, or decorative visual interest *without* competing with the Lifeline Magenta CTA.
* **Verification Green (#10B981)**
  * **Role:** Positive reinforcement. Used sparingly for success states, checkmarks, and "Verified" badges to signal safety and completion.

## 3. Typography Rules
* **Font Family:** A clean, highly legible sans-serif (e.g., Inter or Roboto).
* **Headers (The Guide):** Set in **Trustworthy Navy** using Bold or Semi-Bold weights. Headers must be simple and conversational (e.g., "Tell us about your loved one"). *Never* colored in Lifeline Magenta.
* **Body (The Translator):** Set in a slightly muted dark gray (e.g., `#334155`) with Regular weight. Line spacing (leading) must be generous (e.g., `leading-relaxed`) to accommodate users experiencing "chemo brain" or cognitive fatigue. 
* **Links (The Options):** Inherit the **Lifeline Magenta** color with a medium weight. 

## 4. Component Stylings
* **Primary Buttons (The North Star):** 
  * **Shape:** Pill-shaped (generously rounded edges, `rounded-full`).
  * **Style:** Solid **Lifeline Magenta** background with white text. 
  * **Usage:** Limited to exactly **one per screen**. This dictates the single most important action the user should take to move forward.
* **Secondary Buttons:** 
  * **Shape:** Pill-shaped (`rounded-full`).
  * **Style:** Transparent background with a **Lifeline Magenta** border (outline) and text. 
  * **Usage:** Used for alternative actions (e.g., "Cancel" or "Share this Tool") that support, but do not compete with, the Primary CTA.
* **Cards & Patient Vault Containers:** 
  * **Shape:** Generously rounded corners (`rounded-2xl`).
  * **Surface:** Pure white (`#FFFFFF`) to pop slightly off the Calming Slate background.
  * **Depth:** Whisper-soft diffused shadows (`shadow-sm` or `shadow-md`). Cards should feel like lightweight pieces of paper floating on the screen, not heavy concrete blocks. 
* **Accordions & Expandables:** 
  * Used constantly to practice "Clarity is Kindness." Complex medical data is hidden inside soft-bordered, expandable rows. The expand/collapse chevron icon is the *only* interactive indicator, colored in Lifeline Magenta.

## 5. Layout Principles
* **The "One Clear Path" Alignment:** Every layout is designed to funnel the user's eye down to the single Primary CTA. Distractions are minimized. 
* **Generous Whitespace:** Margins and padding between sections must be intentionally large (`py-12` or `gap-8`). This physical spacing acts as a visual "deep breath" for the user, ensuring the interface never feels like a "choppy ocean" of dense information.
* **Progressive Disclosure:** Forms and workflows are broken down into bite-sized, sequential steps (1 -> 2 -> 3) rather than long, scrolling pages. We ask one conversational question at a time.