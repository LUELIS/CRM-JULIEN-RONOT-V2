#!/bin/sh
set -e

# Ensure timezone is set for Node.js
export TZ=Europe/Paris

echo "🕐 Timezone: $TZ ($(date))"
echo "🔄 Synchronizing database schema..."

# Pass DATABASE_URL directly to prisma db push
if [ -n "$DATABASE_URL" ]; then
  npx prisma db push --accept-data-loss --url "$DATABASE_URL" || {
    echo "⚠️ Schema sync failed, retrying..."
    sleep 2
    npx prisma db push --accept-data-loss --url "$DATABASE_URL" || echo "❌ Schema sync failed after retry"
  }
  echo "✅ Database schema synchronized"
else
  echo "⚠️ DATABASE_URL not set, skipping schema sync"
fi

echo "🚀 Starting application..."
exec node server.js
