import type { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateChartTrack1780800000000 implements MigrationInterface {
  name = 'CreateChartTrack1780800000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "chart_tracks" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "source_id" character varying NOT NULL,
        "title" character varying NOT NULL,
        "artist" character varying NOT NULL,
        "thumbnail" character varying NOT NULL,
        "playlist_id" character varying NOT NULL,
        "genre" character varying NOT NULL,
        "country" character varying,
        "rank" integer NOT NULL,
        "fetched_at" TIMESTAMP WITH TIME ZONE NOT NULL,
        CONSTRAINT "PK_chart_tracks" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`CREATE INDEX "IDX_chart_tracks_genre_rank" ON "chart_tracks" ("genre", "rank")`);
    await queryRunner.query(`CREATE INDEX "IDX_chart_tracks_playlist_id" ON "chart_tracks" ("playlist_id")`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "IDX_chart_tracks_playlist_id"`);
    await queryRunner.query(`DROP INDEX "IDX_chart_tracks_genre_rank"`);
    await queryRunner.query(`DROP TABLE "chart_tracks"`);
  }
}
