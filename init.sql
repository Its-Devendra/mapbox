-- Create the mapbox_user and grant necessary permissions
CREATE USER mapbox_user WITH PASSWORD 'mapboX123';
GRANT ALL PRIVILEGES ON DATABASE mapbox_db TO mapbox_user;
ALTER USER mapbox_user CREATEDB;

-- Create the database if it doesn't exist
CREATE DATABASE IF NOT EXISTS mapbox_db;

-- Grant permissions on the mapbox_db
GRANT ALL PRIVILEGES ON DATABASE mapbox_db TO mapbox_user;