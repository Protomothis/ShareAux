import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddRoomAutoDjAiColumns1778480000000 implements MigrationInterface {
  name = 'AddRoomAutoDjAiColumns1778480000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "rooms" ADD "auto_dj_tags" jsonb`);
    await queryRunner.query(`ALTER TABLE "rooms" ADD "auto_dj_prompt" character varying(200)`);
    await queryRunner.query(`ALTER TABLE "rooms" ADD "auto_dj_paused" boolean NOT NULL DEFAULT false`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "rooms" DROP COLUMN "auto_dj_paused"`);
    await queryRunner.query(`ALTER TABLE "rooms" DROP COLUMN "auto_dj_prompt"`);
    await queryRunner.query(`ALTER TABLE "rooms" DROP COLUMN "auto_dj_tags"`);
  }
}
