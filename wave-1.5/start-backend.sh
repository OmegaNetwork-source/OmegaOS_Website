#!/bin/bash
# Script to start the backend API server
# Run this from the wave-1.5 directory

echo "Starting Wave 1.5 Backend API..."
echo ""

cd backend

# Check if .env exists, if not create from example
if [ ! -f .env ]; then
    echo "Creating .env file from .env.example..."
    cp .env.example .env
    echo "⚠️  Please edit .env and set ADMIN_SECRET!"
    echo ""
fi

# Start the server
echo "Starting server on http://localhost:3000"
npm start
