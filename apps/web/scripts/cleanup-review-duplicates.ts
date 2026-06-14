import { sql } from "drizzle-orm";
import { db } from "../lib/db/client";

function isDryRun() {
  return process.argv.includes("--dry-run");
}

async function main() {
  const dryRun = isDryRun();
  await db.execute(sql`
    create temporary table review_duplicate_groups as
    with keyed as (
      select
        id,
        reason,
        created_at,
        last_seen_at,
        occurrence_count,
        payload,
        latest_payload,
        latest_error_message,
        coalesce(
          dedupe_key,
          md5(
            reason || '|' ||
            coalesce(payload->>'provider_slug', payload->>'provider', payload->>'canonical_provider', payload->>'model_owner_provider', payload->>'source_provider', '') || '|' ||
            coalesce(payload->>'model_id', payload->>'model_slug', payload->>'canonical_model_slug', entity_id::text, '') || '|' ||
            coalesce(payload->>'source_url', '') || '|' ||
            coalesce(payload->>'currency_native', '') || '|' ||
            coalesce(payload->>'region', '') || '|' ||
            coalesce(payload->>'pricing_type', '') || '|' ||
            coalesce(payload->>'source_provider', '')
          )
        ) as group_key,
        (
          case when coalesce(payload->>'source_url', '') <> '' then 1 else 0 end +
          case when latest_payload is not null then 1 else 0 end +
          case when coalesce(payload->>'confidence', payload->>'confidence_score', '') <> '' then 1 else 0 end +
          case when coalesce(payload->>'currency_native', '') <> '' then 1 else 0 end +
          case when coalesce(payload->>'region', '') <> '' then 1 else 0 end
        ) as completeness
      from review_queue
      where status = 'pending'
    ),
    grouped as (
      select group_key, count(*) as c
      from keyed
      group by group_key
      having count(*) > 1
    ),
    ranked as (
      select
        k.*,
        row_number() over (partition by k.group_key order by k.completeness desc, k.created_at asc, k.id asc) as rn,
        sum(k.occurrence_count) over (partition by k.group_key) as total_occurrence,
        max(k.last_seen_at) over (partition by k.group_key) as merged_last_seen_at,
        first_value(coalesce(k.latest_payload, k.payload)) over (partition by k.group_key order by k.last_seen_at desc, k.created_at desc) as merged_latest_payload,
        first_value(k.latest_error_message) over (partition by k.group_key order by (k.latest_error_message is not null) desc, k.last_seen_at desc) as merged_latest_error_message
      from keyed k
      join grouped g on g.group_key = k.group_key
    )
    select * from ranked
  `);

  const [before] = await db.execute<{ duplicate_groups: number; duplicate_rows: number }>(sql`
    select
      count(distinct group_key)::int as duplicate_groups,
      coalesce(sum(case when rn > 1 then 1 else 0 end), 0)::int as duplicate_rows
    from review_duplicate_groups
  `).then((r) => r.rows);

  if (!dryRun) {
    await db.execute(sql`
      insert into review_audit_logs(review_id, action, actor, before, after, message)
      select
        id,
        'mark-duplicate',
        'system',
        jsonb_build_object('status', 'pending', 'reason', reason, 'group_key', group_key),
        jsonb_build_object('status', 'ignored_duplicate', 'kept_review_id', (
          select id from review_duplicate_groups keep where keep.group_key = review_duplicate_groups.group_key and keep.rn = 1
        )),
        'review duplicate cleanup'
      from review_duplicate_groups
      where rn > 1
    `);

    await db.execute(sql`
      update review_queue rq
      set
        status = 'ignored_duplicate',
        resolution = jsonb_build_object(
          'action', 'ignored_duplicate',
          'at', now(),
          'kept_review_id', (select keep.id from review_duplicate_groups keep where keep.group_key = d.group_key and keep.rn = 1)
        ),
        resolved_at = now(),
        last_seen_at = d.merged_last_seen_at,
        latest_payload = d.merged_latest_payload,
        latest_error_message = d.merged_latest_error_message
      from review_duplicate_groups d
      where rq.id = d.id and d.rn > 1
    `);

    await db.execute(sql`
      update review_queue rq
      set
        occurrence_count = greatest(rq.occurrence_count, d.total_occurrence::int),
        last_seen_at = d.merged_last_seen_at,
        latest_payload = d.merged_latest_payload,
        latest_error_message = d.merged_latest_error_message,
        dedupe_key = coalesce(rq.dedupe_key, d.group_key)
      from review_duplicate_groups d
      where rq.id = d.id and d.rn = 1
    `);
  }

  const [after] = await db.execute<{ duplicate_groups: number; duplicate_rows: number }>(sql`
    with keyed as (
      select coalesce(
        dedupe_key,
        md5(
          reason || '|' ||
          coalesce(payload->>'provider_slug', payload->>'provider', payload->>'canonical_provider', payload->>'model_owner_provider', payload->>'source_provider', '') || '|' ||
          coalesce(payload->>'model_id', payload->>'model_slug', payload->>'canonical_model_slug', entity_id::text, '') || '|' ||
          coalesce(payload->>'source_url', '') || '|' ||
          coalesce(payload->>'currency_native', '') || '|' ||
          coalesce(payload->>'region', '') || '|' ||
          coalesce(payload->>'pricing_type', '') || '|' ||
          coalesce(payload->>'source_provider', '')
        )
      ) as group_key
      from review_queue
      where status = 'pending'
    ),
    grouped as (
      select group_key, count(*) c
      from keyed
      group by group_key
      having count(*) > 1
    )
    select count(*)::int as duplicate_groups, coalesce(sum(c - 1), 0)::int as duplicate_rows from grouped
  `).then((r) => r.rows);

  console.log(JSON.stringify({
    dryRun,
    before,
    marked_duplicate: dryRun ? 0 : Number(before?.duplicate_rows ?? 0),
    after,
  }, null, 2));
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => {
    process.exit(process.exitCode ?? 0);
  });
