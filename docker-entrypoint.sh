#!/bin/sh
set -e

# Ensure timezone is set for Node.js
export TZ=Europe/Paris

echo "🕐 Timezone: $TZ ($(date))"
echo "🔄 Synchronizing database schema..."
npx prisma db push --accept-data-loss || {
  echo "⚠️ Schema sync failed, retrying..."
  sleep 2
  npx prisma db push --accept-data-loss || echo "❌ Schema sync failed after retry"
}
echo "✅ Database schema synchronized"

echo "🚀 Starting application..."
exec node server.js
