-- CreateEnum
CREATE TYPE "OrdenCompraEstado" AS ENUM ('BORRADOR', 'CONFIRMADA', 'CANCELADA');

-- CreateEnum
CREATE TYPE "OrdenCompraOrigen" AS ENUM ('MANUAL', 'ASISTENTE');

-- CreateTable
CREATE TABLE "ordenes_compra" (
    "id" TEXT NOT NULL,
    "estado" "OrdenCompraEstado" NOT NULL DEFAULT 'BORRADOR',
    "origen" "OrdenCompraOrigen" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "proveedorId" TEXT NOT NULL,
    "createdBy" TEXT NOT NULL,

    CONSTRAINT "ordenes_compra_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "orden_compra_items" (
    "id" TEXT NOT NULL,
    "cantidadSugerida" INTEGER NOT NULL,
    "ordenCompraId" TEXT NOT NULL,
    "productoId" TEXT NOT NULL,

    CONSTRAINT "orden_compra_items_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "ordenes_compra" ADD CONSTRAINT "ordenes_compra_proveedorId_fkey" FOREIGN KEY ("proveedorId") REFERENCES "suppliers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ordenes_compra" ADD CONSTRAINT "ordenes_compra_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orden_compra_items" ADD CONSTRAINT "orden_compra_items_ordenCompraId_fkey" FOREIGN KEY ("ordenCompraId") REFERENCES "ordenes_compra"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orden_compra_items" ADD CONSTRAINT "orden_compra_items_productoId_fkey" FOREIGN KEY ("productoId") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
