CREATE DATABASE IF NOT EXISTS efs_vms_chatbot;
USE efs_vms_chatbot;

CREATE TABLE IF NOT EXISTS users (
    id              INT AUTO_INCREMENT PRIMARY KEY,
    email           VARCHAR(255) UNIQUE NOT NULL,
    password_hash   VARCHAR(255) NOT NULL,
    full_name       VARCHAR(255) NOT NULL,
    employee_id     VARCHAR(255),
    department      VARCHAR(255),
    role            VARCHAR(255),
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS sessions (
    session_id     VARCHAR(255) PRIMARY KEY,
    user_id        VARCHAR(255),
    user_email     VARCHAR(255),
    access_token   TEXT,
    refresh_token  TEXT,
    room_location  VARCHAR(255),
    local_storage_info JSON,
    chat_history   JSON,
    api_data       JSON,
    last_updated   TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS chat_history (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    session_id  VARCHAR(255),
    role        ENUM('user', 'assistant', 'system'),
    content     TEXT,
    timestamp   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (session_id) REFERENCES sessions(session_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS agent_events (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    session_id  VARCHAR(255),
    agent_name  VARCHAR(255),
    event_data  JSON,
    timestamp   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (session_id) REFERENCES sessions(session_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS room_bookings (
    id              INT AUTO_INCREMENT PRIMARY KEY,
    booking_id      VARCHAR(255),
    user_id         VARCHAR(255),
    user_email      VARCHAR(255),
    session_id      VARCHAR(255),
    room_name       VARCHAR(255),
    space_id        VARCHAR(255),
    location_id     VARCHAR(255),
    floor_id        VARCHAR(255),
    floor_name      VARCHAR(255),
    space_type_id   VARCHAR(255),
    booking_date    DATE,
    start_time      VARCHAR(10),
    end_time        VARCHAR(10),
    title           VARCHAR(500),
    status          VARCHAR(50) DEFAULT 'confirmed',
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
