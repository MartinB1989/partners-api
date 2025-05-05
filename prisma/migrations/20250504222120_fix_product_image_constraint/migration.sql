-- DropIndex
DROP INDEX "ProductImage_productId_main_key";

-- AddIndex
-- Este índice parcial solo se aplica cuando main=true, permitiendo múltiples registros con main=false
CREATE UNIQUE INDEX "unique_main_true_per_product" ON "ProductImage" ("productId")
WHERE main = true;
