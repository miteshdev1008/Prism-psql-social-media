-- CreateTable
CREATE TABLE "posts" (
    "id" SERIAL NOT NULL,
    "posted_by" INTEGER NOT NULL,
    "likes" INTEGER,
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "liked_by" INTEGER[],
    CONSTRAINT "posts_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "posts" ADD CONSTRAINT "posts_posted_by_fkey" FOREIGN KEY ("posted_by") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
