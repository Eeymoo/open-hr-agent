#!/bin/sh
set -e

# Handle Docker Secrets - read *_FILE variables and export them
if [ -n "$DATABASE_URL_FILE" ]; then
  export DATABASE_URL=$(cat $DATABASE_URL_FILE)
fi

if [ -n "$GITHUB_WEBHOOK_SECRET_FILE" ]; then
  export GITHUB_WEBHOOK_SECRET=$(cat $GITHUB_WEBHOOK_SECRET_FILE)
fi

if [ -n "$DOCKER_CA_SECRET_FILE" ]; then
  export DOCKER_CA_SECRET=$(cat $DOCKER_CA_SECRET_FILE)
fi

if [ -n "$CSP_DOMAIN_FILE" ]; then
  export CSP_DOMAIN=$(cat $CSP_DOMAIN_FILE)
fi

# Wait for database to be ready
echo "Waiting for database connection..."
while ! npx prisma db push --skip-generate 2>/dev/null; do
  echo "Database not ready yet, retrying..."
  sleep 2
done

echo "Database schema updated successfully"

# Start the application
exec node dist/index.js
