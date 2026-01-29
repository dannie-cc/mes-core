#!/bin/sh

# Wait for MinIO to be ready
echo "Waiting for MinIO to start..."
until curl -sf http://localhost:9000/minio/health/ready; do
    echo "MinIO not ready, waiting..."
    sleep 2
done

echo "MinIO is ready, creating bucket..."

# Configure mc client
mc alias set local http://localhost:9000 "$MINIO_ROOT_USER" "$MINIO_ROOT_PASSWORD"

# Create bucket if it doesn't exist
mc mb local/mes-local --ignore-existing

echo "Bucket 'mes-local' created successfully"