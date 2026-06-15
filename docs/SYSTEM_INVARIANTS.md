# System Invariants

This document freezes the non-negotiable data rules for ModelPrice Radar. Future agents should read this before changing crawlers, rankings, recommendations, homepage modules, or review workflows.

## Data Meaning

1. `source_freshness_status` is not `model_recency_status`.
   - Source freshness only means a source was checked recently.
   - Model recency means the model version is still current/recent rather than previous/stale/unknown.

2. Official-current model judgment must prefer the official current catalog.
   - The current implementation lives in `packages/pricing-core/src/official-current/index.ts`.
   - Official docs, pricing pages, model lists, or changelogs are valid evidence.
   - Model-name guessing is not enough.

3. Fallback catalogs are candidates, not live official truth.
   - A fallback entry must carry source URL, checked date, confidence, and notes.
   - Fallback data may seed candidates or audits, but should not silently become homepage official-current proof.

4. Third-party aggregator sources cannot by themselves decide homepage official-current status.
   - OpenRouter, LiteLLM, llm-prices, genai-prices, Together, Fireworks, and similar sources may provide pricing or extra availability.
   - They do not replace official current/recommended evidence.

5. Price rankings must have prices.
   - Frontier-value, domestic price, low-cost, and legacy-low-cost rankings cannot include unpriced rows as priced entries.
   - Unpriced official-current models belong in latest discovery or price-pending modules.

6. Latest model discovery may include unpriced models.
   - If the official latest model is found but price is unknown, insert/keep it as a candidate and mark `needs_pricing_review=true`.
   - Do not use an older priced model as a substitute for the current official model.

7. Domestic RMB rankings must prioritize native CNY prices.
   - USD-estimated RMB must be explicitly marked as estimated.
   - USD estimates must not look like official domestic RMB prices.

8. Old models belong in old-model or full-library surfaces.
   - `previous_generation`, `legacy`, and `deprecated` models should not appear in default homepage official-current or balanced recommendation surfaces.

9. `review_queue` is the uncertainty buffer.
   - Uncertain, conflicting, low-confidence, or missing-source data should go through review instead of being strongly recommended.
   - Duplicate review items must be upserted/deduped, not allowed to grow without bound.

10. Canonical provider is for display, grouping, and dedupe.
    - Raw `source_provider` must remain available for provenance.
    - `model_owner_provider`, `selling_platform_provider`, and `source_provider` must not be collapsed into one field.

11. Canonical model fields are for grouping, not evidence destruction.
    - `canonical_model_slug`, `model_family`, and `model_variant` may merge variants for display/ranking.
    - Original source model IDs and source URLs must remain inspectable.

12. Homepage must not force-fill eight slots with uncertain models.
    - If only six official-current models pass the gate, show six and surface missing/price-pending models separately.
    - A visually full section is less important than trustworthy classification.

13. Official latest without price means price pending.
    - Show price-pending status.
    - Do not replace it with an older priced model in official-current surfaces.

14. DB-stored lifecycle and runtime-enriched lifecycle are different layers today.
    - Stored `models.lifecycle_tier` can be stale or broad.
    - Runtime fields from official catalog and latest candidates are currently the stronger source for homepage gating.
    - Any future migration should make this distinction explicit instead of hiding it.

