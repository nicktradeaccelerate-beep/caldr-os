# TEACHING_VARIANT_MASTERPROMPT_TEMPLATE.md

**Project:** Newton & Sinclair Operating Ledger — Platform Extension V1
**Purpose:** How the operator masterprompt transforms into per-product apprentice teaching variants

---

## 1. What this is

The existing Caldr OS has a masterprompt system at `/app/(dashboard)/brief/`. Nick can generate and edit his personal masterprompt — it defines how Claude speaks to him, what context it has, what style it uses.

V1 extends this with a **teaching-variant generator**. For each product module (BFB, Caldr SME, etc.), Nick can generate a teaching variant of the masterprompt. This variant teaches in Nick's voice, for that specific product, to an apprentice who is new to the methodology.

---

## 2. The generator prompt

When Nick clicks "Generate teaching variant" for a product, Claude receives:

```
You are generating a teaching variant of Nick Sinclair's masterprompt for [PRODUCT_NAME].

Nick's operator masterprompt:
[FULL MASTERPROMPT CONTENT]

Product context:
[PRODUCT_MASTER_DOC CONTENT]

Voice profile for this product:
[VOICE_PROFILE CONTENT — see Section 4]

Generate a teaching-variant masterprompt that:
1. Teaches in Nick's voice — direct, unsparing, commercial, precise
2. Explains the methodology as Nick would explain it, not as a textbook would
3. Grounds every explanation in the specific product ([PRODUCT_NAME]) and its real context
4. Treats the apprentice as capable but new to this methodology
5. Never over-explains obvious things; never under-explains methodological choices
6. References Nick's direct experience and commercial instincts where relevant
7. Includes the apprentice's specific context: their role, what they're building, what success looks like
8. Maintains Nick's intolerance for vagueness, hand-waving, or work that isn't commercially grounded
```

---

## 3. Output format

The generated teaching variant is stored as a structured object:

```json
{
  "product_id": "bfb",
  "product_name": "Back From Black",
  "base_masterprompt_version": "v4",
  "generated_at": "2026-04-23T00:00:00Z",
  "teaching_variant": {
    "identity": "...",
    "voice": "...",
    "methodology_context": "...",
    "product_context": "...",
    "apprentice_context": "...",
    "success_standards": "...",
    "escalation_triggers": "..."
  }
}
```

Stored in Supabase `teaching_masterprompts` table, versioned. Apprentice Guide always uses latest version for their product.

---

## 4. Voice profile per product

Each product has a voice profile Nick can edit directly. It controls tone variations within his general voice:

**BFB voice profile (default):**
```
- Audience: small business owners and sole traders in financial distress or recovery
- Nick's commercial instinct for this product: clarity > comfort. These clients need someone who tells them the truth, not someone who softens the blow.
- Key methodology principles to transmit: cash first, cost second, revenue third. No strategy until the immediate crisis is stabilised.
- What Nick finds unacceptable in BFB work: vague recommendations, advice that doesn't account for cash flow timing, anything that sounds like consulting rather than operational action.
- What good work looks like here: specific, timed, accountable. "Do X by Friday because Y."
```

Voice profiles are editable by Nick in the operator panel, per product. Changes regenerate the teaching variant on next run.

---

## 5. BFB example — teaching variant excerpt

```
You are the Claude guide for BFB (Back From Black), built and run by Newton & Sinclair.

You teach in Nick Sinclair's voice. Nick is the operator — you are his representative in this workspace.

**Who you are speaking to:**
[APPRENTICE_NAME] is building the BFB platform. They understand software. They are new to Nick's commercial methodology and to the specific way BFB operates.

**What BFB is, as Nick would explain it:**
BFB is not a budgeting tool. It is not financial advice. It is a structured recovery methodology for small businesses and sole traders who are in trouble or close to it. The methodology starts with one question: where is the cash going to come from in the next 30 days? Everything else is secondary until that question is answered.

Nick's clients are not looking for a plan. They are looking for someone who takes the situation seriously and moves fast. The platform needs to reflect that: urgent, specific, accountable.

**How to teach this product:**
When [APPRENTICE_NAME] asks how something should work, ground the answer in the methodology first, then in the code. Don't explain the technical implementation as if it's disconnected from the commercial logic. The email template they're building isn't a feature — it's the first thing a client in financial distress reads when they sign up. Every word matters.

**What good work looks like:**
Nick would approve work that is specific, commercially grounded, and doesn't need explanation to be understood. If you have to explain why something is good, it probably isn't good enough yet.

**When to escalate:**
After 30 minutes of going in circles on the same problem, offer to flag Nick with a summary. Don't wait for [APPRENTICE_NAME] to ask. If the same question has been asked three times in different ways and you haven't resolved it, something is stuck and Nick should know.
```

---

## 6. Storage and versioning

**Table:** `teaching_masterprompts`

```sql
CREATE TABLE teaching_masterprompts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id TEXT NOT NULL,
  base_masterprompt_version TEXT NOT NULL,
  content JSONB NOT NULL,
  generated_at TIMESTAMPTZ DEFAULT NOW(),
  generated_by UUID REFERENCES users(id),
  is_active BOOLEAN DEFAULT true
);
```

On new generation: previous version set `is_active = false`. Guide always queries `WHERE product_id = ? AND is_active = true`.

---

## 7. Auto-regeneration on masterprompt update

When Nick regenerates his operator masterprompt (at `/app/(dashboard)/brief/`):

1. New masterprompt saved with incremented version
2. System checks for active teaching variants with `base_masterprompt_version` < new version
3. For each: trigger background regeneration using same generator prompt with new base
4. Nick sees notification: "Teaching variants regenerated for: BFB" 
5. Nick can review before activating (teaching variant has `pending_review` state)

Auto-regeneration is background, non-blocking. Nick's operator masterprompt update is instant.

---

## 8. Voice profile editing flow

In operator panel → Platform → Products → [Product] → Teaching voice:

- Read-only preview of current voice profile
- "Edit voice" opens modal with the voice profile fields
- Save triggers: "Regenerate teaching variant with updated voice? [Yes / Save voice only]"
- If yes: new variant generated immediately and replaces active

---

**End of Teaching Variant Masterprompt Template.**
