import { pool } from "../storage/client.js";
import type { QueryResultRow } from "pg";

async function query<T extends QueryResultRow = QueryResultRow>(text: string, params: unknown[] = []) {
  const result = await pool.query<T>(text, params);
  return result.rows;
}

function printSection(title: string, value: unknown) {
  console.log(`\n## ${title}`);
  console.log(JSON.stringify(value, null, 2));
}

async function main() {
  const [sourceSummary] = await query(`
    with latest as (
      select source_id, max(fetched_at) as fetched_at
      from source_fetch_logs
      where status in ('success', 'partial')
      group by source_id
    )
    select
      count(*)::int as sources,
      count(*) filter (where fetched_at < now() - interval '12 hours')::int as stale_over_12h,
      count(*) filter (where fetched_at < now() - interval '24 hours')::int as stale_over_24h,
      max(fetched_at) as latest_source_checked_at
    from latest
  `);

  const [pricingSummary] = await query(`
    select
      max(updated_at) as latest_pricing_checked_at,
      count(*) filter (where is_current = true and updated_at < now() - interval '12 hours')::int as pricing_over_12h,
      count(*) filter (where is_current = true and updated_at < now() - interval '24 hours')::int as pricing_over_24h,
      count(*) filter (where is_current = true and currency_native = 'CNY' and region = 'china_mainland')::int as cny_pricing
    from pricing
  `);

  const homepageTop8 = await query(`
    select
      m.slug as model_slug,
      m.name as model_name,
      coalesce(m.model_owner_provider, pr.canonical_slug, pr.slug) as provider,
      coalesce(m.model_family, m.family, m.slug) as model_family,
      coalesce((
        select l.lifecycle_tier
        from latest_model_candidates l
        where l.model_slug = m.slug
        order by l.last_seen_at desc
        limit 1
      ), m.lifecycle_tier) as lifecycle_tier,
      max(p.updated_at) as pricing_checked_at,
      round(extract(epoch from (now() - max(p.updated_at))) / 3600, 1) as pricing_age_hours,
      max(p.currency_native) as currency_native,
      max(p.region) as region,
      max(p.source_url) as source_url
    from models m
    join providers pr on pr.id = m.provider_id
    join pricing p on p.model_id = m.id and p.is_current = true and p.pricing_type = 'api_token'
    where m.status = 'active'
      and (
        m.lifecycle_tier in ('current_frontier', 'current_mainstream')
        or exists (
          select 1 from latest_model_candidates l
          where l.model_slug = m.slug
            and l.lifecycle_tier in ('current_frontier', 'current_mainstream')
            and l.discovery_status <> 'stale'
        )
      )
      and (
        p.updated_at >= now() - interval '12 hours'
        or exists (
          select 1 from latest_model_candidates l
          where l.model_slug = m.slug
            and l.last_seen_at >= now() - interval '12 hours'
            and l.discovery_status <> 'stale'
        )
      )
      and coalesce(m.needs_pricing_review, false) = false
      and coalesce(p.need_manual_review, false) = false
      and not (m.data_quality_flags ?| array['suspicious_name','needs_manual_review'])
    group by m.id, pr.slug, pr.canonical_slug
    order by
      case m.lifecycle_tier when 'current_frontier' then 0 else 1 end,
      greatest(coalesce(m.source_confidence::float, 0), 0) desc,
      max(p.updated_at) desc
    limit 8
  `);

  const frontierStale = await query(`
    select m.slug, m.name, m.lifecycle_tier, max(p.updated_at) as pricing_checked_at
    from models m
    join pricing p on p.model_id = m.id and p.is_current = true and p.pricing_type = 'api_token'
    where m.status = 'active' and m.lifecycle_tier in ('current_frontier', 'current_mainstream')
    group by m.id
    having max(p.updated_at) < now() - interval '24 hours'
    order by max(p.updated_at) asc
    limit 20
  `);

  const oldestPricing = await query(`
    select m.slug, m.name, max(p.updated_at) as pricing_checked_at
    from models m
    join pricing p on p.model_id = m.id and p.is_current = true and p.pricing_type = 'api_token'
    group by m.id
    order by max(p.updated_at) asc
    limit 20
  `);

  const oldestSources = await query(`
    with latest as (
      select source_id, max(fetched_at) as fetched_at
      from source_fetch_logs
      where status in ('success', 'partial')
      group by source_id
    )
    select source_id, fetched_at, round(extract(epoch from (now() - fetched_at)) / 3600, 1) as age_hours
    from latest
    order by fetched_at asc
    limit 20
  `);

  printSection("source freshness", sourceSummary);
  printSection("pricing freshness", pricingSummary);
  printSection("homepage top8 freshness approximation", homepageTop8);
  printSection("stale current frontier/mainstream over 24h", frontierStale);
  printSection("oldest pricing top20", oldestPricing);
  printSection("oldest source checks top20", oldestSources);
}

main()
  .catch((err) => {
    console.error("audit:freshness failed", err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
