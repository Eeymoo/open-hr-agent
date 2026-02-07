#!/bin/sh
set -e

# Wait for database to be ready
echo "Waiting for database connection..."
while ! npx prisma db push --skip-generate 2>/dev/null; do
  echo "Database not ready yet, retrying..."
  sleep 2
done

echo "Database schema updated successfully"

# Start the application
exec node dist/index.js
