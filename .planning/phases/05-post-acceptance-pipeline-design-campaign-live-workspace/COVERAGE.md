# API Coverage — Google Gemini (via `google-genai`)

> Full coverage by default. Opt-outs are explicit, reasoned decisions.

**Phase:** 05 — Post-Acceptance Pipeline
**Consumer:** `backend/app/services/campaign_service._llm_narrative` (plan 05-11)
**Dependency posture:** Phase 5 adds **no** package and **no** new pin. `google-genai` is
inherited from Phase 4 plan 04-05, where it was audited and cleared. Phase 5 is the **second**
consumer of this integration, so per the full-coverage rule every capability below is re-decided
from a full-coverage baseline rather than inheriting Phase 4's opt-outs.

| capability | decision | reason |
|---|---|---|
| text generation (`models.generate_content`) | INTEGRATE | |
| `system_instruction` | INTEGRATE | Carries the task and the prompt-injection boundary; the untrusted brand text stays in `contents` |
| generation config (`temperature`, `max_output_tokens`) | INTEGRATE | Bounds the narrative to 80–120 words and caps spend per call |
| graceful unavailability (missing SDK, missing key, vendor error) | INTEGRATE | D-04's degraded static template; ROADMAP criterion 2 requires a usable draft with no AI key |
| streaming (`generate_content_stream`) | OPT-OUT | The output is one short paragraph the organiser edits afterwards; a streaming transport has no analog anywhere in this SPA and would add one for no perceived latency win |
| multi-turn chat (`chats.create`) | OPT-OUT | Every generation is stateless and idempotent by design (AC-10, last-write-wins); a conversation would introduce state the campaign package has nowhere to hold |
| structured output / `response_schema` | OPT-OUT | PROB-P1 keeps every fact out of the model's output, so the response is prose with no structure to parse. Adding a schema would invite the model back into the facts |
| function calling / tools | OPT-OUT | The model must not take actions — it writes a paragraph and nothing else. This is a security boundary, not a convenience |
| Google Search grounding | OPT-OUT | Actively undesirable: grounded external facts are exactly what CAMPAIGN-01 forbids the model from producing |
| image generation | OPT-OUT | Explicitly out of scope — stays behind `AI_IMAGE_ENABLED`, off by default (05-SPEC § Out of Scope). Posters are uploaded, not generated |
| multimodal / image input | OPT-OUT | Not needed yet — no Phase 5 flow sends an image to the model |
| embeddings (`models.embed_content`) | OPT-OUT | Not needed yet — no retrieval or semantic-search feature exists in v1 |
| File API (`files.upload`) | OPT-OUT | Not needed — poster bytes stay on the local filesystem (`backend/instance/uploads/`), the storage decision STATE.md resolved on 2026-08-06 |
| context caching | OPT-OUT | Not needed yet — a handful of short calls per event; caching would add a lifecycle to manage for no measurable gain |
| batch mode | OPT-OUT | Not needed — generation is user-triggered and interactive, one activity at a time |
| token counting (`models.count_tokens`) | OPT-OUT | Not needed yet — there is no quota accounting or cost display in v1; `max_output_tokens` already bounds each call |
| safety-settings override | OPT-OUT | Provider defaults are appropriate for short student-event invitation copy; no per-call override is warranted, and loosening defaults would need its own decision |
| model tuning / fine-tuning | OPT-OUT | Explicitly out of scope — the brand kit supplies the voice through the prompt, which is the whole point of CAMPAIGN-02 |
| Live / realtime API | OPT-OUT | Not needed — no realtime or audio surface exists anywhere in this product |
| thinking / reasoning configuration | OPT-OUT | Not needed for an 80–120 word invitation paragraph; the added latency and cost buy nothing here |
