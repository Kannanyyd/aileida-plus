# System Logic Audit

Date: 2026-06-15  
Scope: architecture freeze, data-flow audit, source-of-truth clarification, homepage Top8 currentness audit.  
Out of scope: DNS, Nginx, HTTPS, UI redesign, Chinese copy polish, new price-source expansion, commercial features.

## 1. Data Flow

```text
Official model docs / official pricing / changelog / API model list
Third-party aggregators / domestic static CNY pages / fallback catalog / manual review
  -> worker source runners
  -> source_fetch_logs + source_snapshots + model_discovery_logs
  -> latest_model_candidates / pricing candidates
  -> providers + models + pricing + review_queue
  -> canonical provider/model enrichment
  -> data quality flags + review gates
  -> source freshness + model recency + official-current catalog checks
  -> homepage / rankings / recommend / model detail / compare
```

Layer responsibilities:

| Layer | Main data | Responsibility | Current source of truth |
| --- | --- | --- | --- |
| Data source | official docs, pricing pages, changelogs, aggregators, CNY pages, fallback catalog | Produce evidence, not final product decisions | Source URL + fetched snapshot/log |
| Fetch | worker commands, `source_fetch_logs`, `source_snapshots`, `model_discovery_logs` | Prove a source was checked and what was seen | Latest successful/partial fetch log and snapshot |
| Raw data | `providers`, `models`, `pricing`, `latest_model_candidates`, `review_queue`, `provider_aliases`, official catalog | Store discovered entities, prices, aliases, uncertain items | Tables plus official catalog |
| Canonicalization | `canonical_provider_slug`, `model_owner_provider`, `selling_platform_provider`, `source_provider`, `canonical_model_slug`, `model_family`, `model_variant` | Group and dedupe without destroying provenance | Canonical helpers and stored canonical fields |
| Quality control | `data_quality_flags`, confidence, review flags | Prevent uncertain rows from strong product surfaces | Flags + review_queue status |
| Currentness | `source_freshness_status`, `model_recency_status`, `lifecycle_tier`, official catalog, `has_newer_family_model`, `superseded_by_model_id` | Separate source recency from model-version recency | Runtime enrichment plus official-current catalog |
| Output | homepage, latest discovery, rankings, recommend, detail, compare | Present task-specific views | Each view has its own gate; no single global Top8 rule |

## 2. Source Of Truth

| Question | Source of truth | Notes |
| --- | --- | --- |
| Does a model exist? | `models` for accepted models; `latest_model_candidates` for discovered/unconfirmed models | Official candidates can exist before pricing. |
| Is a model official-current/recommended/latest? | Official current catalog, backed by official docs/pricing/model list/changelog | Do not infer this from model name, source freshness, or aggregator presence. |
| Is a model outdated? | Official current catalog + same provider/family supersession + `model_recency_status` | Stored `lifecycle_tier` alone is not enough. |
| Is a price trustworthy? | `pricing` row with source URL, confidence, channel, region, currency, review flags | Low confidence or conflict should go to `review_queue`. |
| Is a price fresh? | `pricing.updated_at` plus source fetch log for the price source | A fresh source log does not prove every price is current. |
| Is this a domestic RMB price? | `pricing.currency_native='CNY'`, `pricing.region='china_mainland'`, `is_domestic=true`, source URL | USD estimates must stay marked as estimates. |
| What powers homepage Top8? | Ranking API with `homepage_strict=true` and `require_official_current=true`, plus official catalog | It must not force-fill uncertain models. |
| What powers recommendations? | `listModels()` enriched rows + recommendation weights + filters + latest alerts | Balanced/default recommendation must not be price-only or old-model dominated. |

Non-negotiables:

- Source freshness cannot substitute for model currentness.
- Third-party aggregators cannot substitute for official-current evidence.
- Fallback catalog must be labeled as fallback evidence.
- Official latest without price should be shown as price pending, not replaced by an older priced model.

## 3. Homepage Top8 Authenticity Audit

Production audit commands used:

- `npm run audit:homepage-currentness`
- `npm run audit:official-current`
- SQL checks against `models`, `pricing`, `source_fetch_logs`.

Current strict homepage Top8 after the latest fix:

| Model | DB model exists | Official catalog exists | Official source URL | Has price | Has CNY | Official status | Higher version risk | Should be homepage Top8? | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `minimax-m3` | Yes | Yes | `https://platform.minimaxi.com/docs/guides/pricing-paygo` | Yes | No | current | None found in catalog | Yes | Price is USD/global in current pricing rows; domestic CNY gap remains. |
| `gemini-flash-latest` | Yes | Yes via alias of `gemini-3.5-flash` | `https://ai.google.dev/gemini-api/docs/models` | Yes | No | recommended | Related Google variants exist | Yes, but alias/canonical cleanup needed | Should eventually prefer canonical slug display over `latest` alias. |
| `gemini-pro-latest` | Yes | Yes via alias of `gemini-3.1-pro-preview` | `https://ai.google.dev/gemini-api/docs/models/gemini-3.1-pro-preview` | Yes | No | current/preview | Preview risk | Conditional | Should be labeled preview/current; not ideal as a quiet default card. |
| `kimi-k2.7-code` | Yes | Yes | `https://platform.moonshot.cn/docs/api/chat` | Yes | Yes | recommended | None found | Yes | Strong China-facing homepage candidate. |
| `grok-4.20` | Yes | Yes by family/alias to official Grok 4 evidence | `https://docs.x.ai/docs/models/grok-4-0709` | Yes | No | current | Slug mismatch risk | Conditional | Needs canonical mapping review: displayed slug differs from catalog slug. |
| `claude-opus-4.8` | Yes | Yes | `https://docs.anthropic.com/en/docs/about-claude/models` | Yes | No | recommended | None found | Yes | Good official-current pick. |
| `kimi-k2.6` | Yes | Yes | `https://platform.moonshot.cn/docs/introduction` | Yes | Yes | current | `kimi-k2.7-code` is stronger for coding | Yes, max-provider cap may hide in some views | Good secondary Kimi candidate, but family naming should be normalized. |
| `gemini-3.5-flash` | Yes | Yes | `https://ai.google.dev/gemini-api/docs/models` | Yes | No | recommended | Alias duplication with `gemini-flash-latest` | Conditional | Should dedupe with alias family so both do not appear together unless explicitly desired. |
| `gpt-5.5` | Yes | Yes | `https://developers.openai.com/api/docs/models` | Yes | No | recommended | None found | Yes | Good official-current pick according to current catalog. |

The request listed nine models while calling it Top8. The strict production Top8 currently excludes `gemini-pro-latest` and includes `gpt-5.5`; the broader before-like ranking still surfaces `gemini-pro-latest` and other non-catalog rows.

Important production result:

- `audit:homepage-currentness` strict check:
  - `all_official_current_or_recommended=true`
  - `previous_stale_unknown_count=0`
  - `missing_official_source_count=0`
  - `source_fresh_but_model_not_current_count=0`
  - `superseded_count=0`
  - `failing=[]`

Remaining Top8 concerns:

- `gemini-flash-latest` and `gemini-3.5-flash` are effectively the same official family and need alias-level dedupe.
- `grok-4.20` matches official Grok 4 by family/alias, but the displayed slug is not the exact official catalog slug; it should be reviewed or normalized.
- `gemini-pro-latest` is preview-related and should be visibly labeled if shown.

## 4. Homepage Module Responsibilities

Homepage should not be one blended "smart Top8". It should be split:

| Module | Purpose | Can show unpriced? | Main rule |
| --- | --- | --- | --- |
| Official current main models | Current/recommended official models | Yes, but must show price pending | Must hit official-current catalog and official source URL |
| Domestic RMB price ranking | China-facing priced choices | No | Native CNY first; USD estimates must be marked |
| Global value ranking | Price/performance among priced models | No | Requires price, source URL, confidence; official or aggregator allowed with label |
| Latest model discovery | Show newly found official models | Yes | Recent official discovery and candidate status |
| Price changes / recent updates | Show price data movement | No for price changes | Based on price source update time, not model version recency |

## 5. Final Homepage Top8 Rule

If homepage keeps a Top8, name it: **Official current main models**.

Required:

- Hit official current catalog.
- `official_source_url` exists.
- Official check/source recency should be visible; if older than 24h, show a warning.
- `model_recency_status in ('current','recent')`.
- `lifecycle_tier in ('current_frontier','current_mainstream')` after enrichment.
- Not superseded.
- No `suspicious_name`.
- No `needs_manual_review`.
- Max provider: 1-2.
- Max model family: 1.
- If priced, show price.
- If unpriced, show price pending and exclude from price/performance sorting.

Current implementation status:

- Runtime strict gate already requires `homepage_strict=true` and `require_official_current=true`.
- It checks source freshness, model recency, official-current catalog evidence, no supersession, and quality flags.
- It still needs better alias-level dedupe for `gemini-flash-latest` vs `gemini-3.5-flash`.

## 6. Ranking Rule Matrix

| Surface | Required fields | Exclusions | Unpriced allowed | Estimated price allowed | Aggregator-only allowed | Preview/beta allowed | Previous generation allowed | Dedupe | Sorting |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Homepage official current | official catalog, official source, source freshness, model recency | suspicious, manual review, superseded, stale source | Yes, but price pending only | No as official price | No as sole proof | Only if explicitly official and labeled | No | canonical provider + model family | official status, capability, confidence, diversity |
| Domestic RMB price ranking | CNY native or clearly estimated fallback, region/channel/source | stale, manual review, old/default hidden | No | Yes only when labeled | Yes if source/channel labeled | Usually no | No by default | canonical provider + family | CNY native bonus, capability, freshness, price |
| Global value ranking | price, source URL, confidence | no price, manual review, missing source, deprecated | No | Yes with label | Yes with label | Conditional | No by default | canonical provider + family | capability + freshness + price + confidence |
| Latest model discovery | candidate source, source URL, last_seen_at | stale candidates | Yes | Not relevant | Yes if marked source | Yes if labeled | Yes only as status signal | canonical provider + slug | last seen, official confidence |
| Old-model low-cost | price, old tier | no price, manual review | No | Yes with label | Yes | Yes if old/legacy context | Yes, intentionally | relaxed | price-heavy |
| Recommendation assistant | scenario, region/payment/channel, quality fields | stale/superseded/low confidence for balanced | Can mention as alert, not priced rec | Yes with explanation | Yes with label | Scenario dependent | Only for low-cost explicit mode | canonical provider + family | scene fit, capability, recency, confidence, region/channel, then price |
| Model detail pricing table | pricing rows, source URL, updated_at, channel, platform | none hidden by default, but flags visible | Yes at model level | Yes if marked | Yes, labeled | Yes, labeled | Yes, labeled | no destructive merge | channel table and best-price summaries |

## 7. Current Mainstream Audit

Production stored DB state:

- Stored `current_frontier`: 15 rows.
- Stored `current_mainstream`: 26 rows.
- `current_mainstream` with pricing: 0.
- `current_mainstream` with `needs_pricing_review=true`: 26.
- `current_mainstream` with official source URL: 26.
- `current_mainstream` with `aggregator_only` flag: 0.
- Pricing sources stale over 12h: 0.

Observation:

- Stored `models.lifecycle_tier` is not the same as runtime enriched ranking tier.
- Many production homepage candidates have stored `lifecycle_tier='unknown'` but become current/recent through runtime official catalog enrichment.
- Conversely, stored `current_frontier/current_mainstream` rows are mostly discovery candidates with `needs_pricing_review=true` and should not automatically enter priced rankings.

Sample stored `current_mainstream` rows include:

- `mistral-small-4`
- `mistral-medium-latest`
- `mistral-medium-3.5`
- `grok-imagine-video-1.5-preview`
- `gemini-3.1-pro`
- `gemini-3-flash`
- `llama-4`
- `command-a-reasoning`
- `qwen3-max-preview`

Treatment strategy:

| Category | Strategy |
| --- | --- |
| Has official catalog evidence and price | Keep eligible for official/current or value surfaces depending on module |
| Has official evidence but no price | Keep in discovery/price-pending; exclude from price rankings |
| Preview/beta/experimental | Keep only if official and visibly labeled; otherwise review |
| Third-party only | Full library or aggregator-labeled rankings; not homepage official-current |
| Suspicious/stale/low confidence | review_queue or hidden from strong surfaces |
| Older family with newer official current model | downgrade to previous_generation or legacy |

## 8. Risk List

| Risk | Current evidence | Severity | Suggested action |
| --- | --- | --- | --- |
| Hard-coded official catalog | `packages/pricing-core/src/official-current/index.ts` | High | Move to DB/admin-managed catalog after rules stabilize |
| Catalog may not be live official fetch | Manual/fallback entries with checked date | High | Add source snapshots and scheduled official-current audit |
| Runtime lifecycle differs from stored lifecycle | Top8 DB rows often stored as `unknown` | High | Add persisted currentness fields or materialized view |
| Alias duplication | `gemini-flash-latest` and `gemini-3.5-flash` can both pass | Medium | Canonical model alias table and family caps |
| Slug mismatch | `grok-4.20` maps to official Grok 4 evidence | Medium | Require exact alias review for homepage candidates |
| Missing official-current DB models | Llama 4, Cohere, Doubao Seed 1.6, GLM-4.6 | High | Insert as candidates/models with price pending |
| Missing pricing for official-current model | `mistral-medium-3.5` | Medium | review_queue + price pending display |
| Stored `current_frontier` over-broad | 15 rows, many `needs_pricing_review=true` | Medium | Do not use stored tier alone for homepage |
| API naming can mislead | `freshness_status` still exists as mixed legacy field | Medium | Deprecate or alias to source/model split in API docs |
| Raw provider leakage | Some surfaces may still use raw provider | Medium | Audit all ranking/detail components for canonical usage |

## 9. Recommended Refactor Roadmap

Must fix immediately:

- Keep homepage strict official-current gate.
- Do not allow non-catalog `is_recommended_by_official` flags to pass homepage official-current.
- Add alias-level dedupe for catalog-equivalent models.
- Keep `SYSTEM_INVARIANTS.md` mandatory for future agents.

Must fix before public launch:

- Persist official-current catalog or add an admin-managed table.
- Add exact source snapshot links for every catalog entry.
- Insert missing official-current models as price-pending candidates.
- Rename/deprecate ambiguous API fields such as `freshness_status`.
- Normalize official slug aliases such as Gemini and Grok.

Can optimize after launch:

- Add materialized currentness view.
- Add full catalog admin workflow.
- Build richer public explanations for each module.
- Add automated daily diff: official catalog vs DB vs pricing.

## 10. Conclusion

The system is now safer than before because homepage strict ranking requires official-current catalog evidence. However, the architecture still has two layers that can confuse future work:

1. Stored lifecycle tier is not always the product-facing currentness decision.
2. The official-current catalog is currently code-managed, not database-managed.

The next engineering work should not be another one-off ranking tweak. It should either:

- add missing official-current models as price-pending candidates, or
- move official-current catalog governance into a durable DB/admin workflow.

