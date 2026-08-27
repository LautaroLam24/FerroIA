-- AlterTable
ALTER TABLE "products" ADD COLUMN     "code" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "products_code_key" ON "products"("code");
