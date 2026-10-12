-- AlterTable: pengaturan organisasi (periode kepengurusan, tarif denda alpa). Keduanya boleh kosong.
ALTER TABLE "organizations" ADD COLUMN "term_start" INTEGER,
ADD COLUMN "fine_absent" INTEGER;

-- CreateTable: laporan fasilitas penerangan desa
CREATE TABLE "lighting_issues" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "location" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "condition" TEXT NOT NULL,
    "note" TEXT,
    "reported_date" DATE NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'terbuka',
    "fixed_date" DATE,
    "created_by" UUID,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ(3),
    "server_seq" BIGINT NOT NULL DEFAULT nextval('server_seq'),

    CONSTRAINT "lighting_issues_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "lighting_issues_organization_id_server_seq_idx" ON "lighting_issues"("organization_id", "server_seq");

-- AddForeignKey
ALTER TABLE "lighting_issues" ADD CONSTRAINT "lighting_issues_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Akses hanya lewat aplikasi (koneksi Prisma), bukan API publik Supabase.
ALTER TABLE "lighting_issues" ENABLE ROW LEVEL SECURITY;
