-- CreateEnum
CREATE TYPE "OnboardingNiche" AS ENUM ('ACADEMIA', 'ESCOLA_CURSOS', 'CONSORCIO', 'GENERICO');

-- CreateEnum
CREATE TYPE "OnboardingTargetPlan" AS ENUM ('START', 'PLENO');

-- CreateTable
CREATE TABLE "onboarding_forms" (
    "id" TEXT NOT NULL,
    "client_id" TEXT NOT NULL,
    "token" TEXT,
    "niche" "OnboardingNiche" NOT NULL,
    "target_plan" "OnboardingTargetPlan" NOT NULL,
    "drive_folder_id" TEXT,
    "drive_folder_url" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by_id" TEXT NOT NULL,

    CONSTRAINT "onboarding_forms_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "onboarding_forms_client_id_key" ON "onboarding_forms"("client_id");

-- CreateIndex
CREATE UNIQUE INDEX "onboarding_forms_token_key" ON "onboarding_forms"("token");

-- CreateTable
CREATE TABLE "onboarding_submissions" (
    "id" TEXT NOT NULL,
    "form_id" TEXT NOT NULL,
    "answers" JSONB NOT NULL,
    "uploads" JSONB NOT NULL,
    "submitted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "onboarding_submissions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "onboarding_submissions_form_id_idx" ON "onboarding_submissions"("form_id");

-- AddForeignKey
ALTER TABLE "onboarding_forms" ADD CONSTRAINT "onboarding_forms_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "onboarding_forms" ADD CONSTRAINT "onboarding_forms_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "onboarding_submissions" ADD CONSTRAINT "onboarding_submissions_form_id_fkey" FOREIGN KEY ("form_id") REFERENCES "onboarding_forms"("id") ON DELETE CASCADE ON UPDATE CASCADE;
