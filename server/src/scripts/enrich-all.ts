/**
 * 임시 스크립트: pending 트랙 일괄 enrich
 * 실행: cd server && npx ts-node --esm src/scripts/enrich-all.ts
 */
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module.js';
import { SearchService } from '../search/search.service.js';
import { DataSource } from 'typeorm';

async function main() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const search = app.get(SearchService);
  const ds = app.get(DataSource);

  const rows = await ds.query(
    `SELECT id, source_id FROM tracks WHERE meta_status = 'pending' OR meta_status IS NULL`,
  ) as { id: string; source_id: string }[];

  console.log(`[enrich-all] ${rows.length} tracks to process`);

  let success = 0;
  let fail = 0;
  for (const [i, row] of rows.entries()) {
    try {
      await search.enrichTrackCredits(row.id, row.source_id);
      const updated = await ds.query(`SELECT song_title FROM tracks WHERE id = $1`, [row.id]) as { song_title: string | null }[];
      if (updated[0]?.song_title) success++;
      else fail++;
    } catch (e) {
      fail++;
      console.error(`[enrich-all] error: ${row.source_id}`, e instanceof Error ? e.message : e);
    }
    if ((i + 1) % 10 === 0) console.log(`[enrich-all] progress: ${i + 1}/${rows.length} (success: ${success}, fail: ${fail})`);
  }

  console.log(`[enrich-all] done: ${success} success, ${fail} fail out of ${rows.length}`);
  await app.close();
}

main().catch(console.error);
