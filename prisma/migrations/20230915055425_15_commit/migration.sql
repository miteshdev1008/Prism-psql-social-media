-- AlterTable
ALTER TABLE "users" ADD COLUMN     "is_login" BOOLEAN DEFAULT false,
ADD COLUMN     "last_seen" TIMESTAMP(6),
ADD COLUMN     "token" TEXT;
