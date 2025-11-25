/*
  Warnings:

  - You are about to drop the column `title` on the `DataPoint` table. All the data in the column will be lost.
  - Added the required column `analysis` to the `Report` table without a default value. This is not possible if the table is not empty.
  - Added the required column `suggestion` to the `Report` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "DataPoint" DROP COLUMN "title";

-- AlterTable
ALTER TABLE "Report" ADD COLUMN     "analysis" TEXT NOT NULL,
ADD COLUMN     "suggestion" TEXT NOT NULL;
