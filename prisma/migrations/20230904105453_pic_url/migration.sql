/*
  Warnings:

  - Added the required column `post_url` to the `posts` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "posts" ADD COLUMN "post_url" TEXT NOT NULL,
ALTER COLUMN "likes" SET DEFAULT 0;
