#!/bin/bash

# Initialize env file
echo "Initializing .env file..."
cp .env.example .env
php artisan key:generate

# Initialize database
echo "Initializing database..."
touch database/database.sqlite

# Populate database
echo "Populating database..."
php artisan migrate
php artisan db:seed

echo "Setup completed successfully!"
