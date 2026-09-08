#!/bin/sh
set -e

echo "Prisma migratsiyalari qo'llanmoqda..."
npx prisma migrate deploy --schema=./prisma/schema.prisma

echo "HMS backend ishga tushirilmoqda..."
exec node dist/main.js
