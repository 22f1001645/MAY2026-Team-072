# API Coverage — Gemini Developer API via `google-genai` 2.18.0

> Full coverage by default. Opt-outs are explicit, reasoned decisions.

**Scope of the integration (04-CONTEXT.md D-04):** one narrow use — *draft a starting brand
kit (voice/tone, colour palette, sample phrases) from an organisation's own profile text*,
returned to one authenticated POR holder for editing, persisting nothing. The capability
surface below is enumerated against **that** use, not against the provider's whole product.

| capability | decision | reason |
|---|---|---|
| text generation (`client.models.generate_content`) | INTEGRATE | |
| structured JSON output (`response_mime_type='application/json'` + schema) | INTEGRATE | |
| API-key client construction from server-side config | INTEGRATE | |
| model selection via config (`GEMINI_MODEL`, default `gemini-2.5-flash`) | INTEGRATE | |
| graceful unavailability (SDK absent / key unset / call fails) | INTEGRATE | |
| streaming responses (`generate_content_stream`) | OPT-OUT | the draft is a single short payload that fills a form in place (UI-SPEC S7-A4); there is no token-by-token surface to stream into |
| multi-turn chat / `client.chats` sessions | OPT-OUT | one-shot draft with no conversation; a second turn would be a second review moment, which criterion 4 forbids |
| function / tool calling | OPT-OUT | the model is never asked for a fact and never invokes an action (04-RESEARCH Security Domain) |
| image generation | OPT-OUT | explicitly out of scope — `PROJECT.md:104` locks poster *generation* behind `AI_IMAGE_ENABLED`, off by default, and image generation has no free tier; CAMPAIGN-07 is v2 |
| file / media upload to the provider (`client.files`) | OPT-OUT | not needed — the draft prompt is text only; org logo bytes never leave this server |
| embeddings (`client.models.embed_content`) | OPT-OUT | not needed — nothing in this phase retrieves, ranks or clusters |
| token counting / usage metering (`count_tokens`) | OPT-OUT | not needed yet — no rate limiter in Phase 4 per D-06; revisit at CAMPAIGN-01 where free-tier exposure is real |
| explicit safety-setting configuration | OPT-OUT | not needed — SDK defaults apply, and the real gate is that every returned field is revalidated by the *same* marshmallow schema the manual save path uses |
| caching (`client.caches`) | OPT-OUT | not needed — one short prompt per call, nothing reused across calls |
| batch / async job API | OPT-OUT | not needed — one interactive request per user press |

**Second-integration note:** if Phase 5 adds a second provider or a second call site against
the same need, it re-decides this matrix from the same full-coverage baseline. The opt-outs
above do not carry over silently.
