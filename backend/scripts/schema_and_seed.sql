-- ============================================================================
-- BFSI Multi-Tenant Intelligent Agent Platform
-- Database Schema DDL & Seed File (MySQL 8.0 / MariaDB compliant)
-- ============================================================================

CREATE DATABASE IF NOT EXISTS `bfsi_platform` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE `bfsi_platform`;

SET FOREIGN_KEY_CHECKS = 0;

-- ----------------------------------------------------------------------------
-- Table: organizations
-- ----------------------------------------------------------------------------
DROP TABLE IF EXISTS `organizations`;
CREATE TABLE `organizations` (
    `id` VARCHAR(36) NOT NULL,
    `name` VARCHAR(255) NOT NULL,
    `slug` VARCHAR(255) NOT NULL,
    `status` VARCHAR(50) NOT NULL DEFAULT 'active',
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_organizations_slug` (`slug`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- Table: users
-- ----------------------------------------------------------------------------
DROP TABLE IF EXISTS `users`;
CREATE TABLE `users` (
    `id` VARCHAR(36) NOT NULL,
    `org_id` VARCHAR(36) DEFAULT NULL,
    `email` VARCHAR(255) NOT NULL,
    `password_hash` VARCHAR(255) NOT NULL,
    `full_name` VARCHAR(255) NOT NULL,
    `role` VARCHAR(50) NOT NULL DEFAULT 'lead',
    `is_active` TINYINT(1) NOT NULL DEFAULT 1,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_users_email` (`email`),
    KEY `idx_users_org_id` (`org_id`),
    CONSTRAINT `fk_users_org_id` FOREIGN KEY (`org_id`) REFERENCES `organizations` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- Table: projects
-- ----------------------------------------------------------------------------
DROP TABLE IF EXISTS `projects`;
CREATE TABLE `projects` (
    `id` VARCHAR(36) NOT NULL,
    `org_id` VARCHAR(36) NOT NULL,
    `name` VARCHAR(255) NOT NULL,
    `domain` VARCHAR(50) NOT NULL,
    `status` VARCHAR(50) NOT NULL DEFAULT 'active',
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    KEY `idx_projects_org_id` (`org_id`),
    CONSTRAINT `fk_projects_org_id` FOREIGN KEY (`org_id`) REFERENCES `organizations` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- Table: project_configs
-- ----------------------------------------------------------------------------
DROP TABLE IF EXISTS `project_configs`;
CREATE TABLE `project_configs` (
    `id` VARCHAR(36) NOT NULL,
    `project_id` VARCHAR(36) NOT NULL,
    `system_prompt` TEXT NOT NULL,
    `guardrails` JSON NOT NULL,
    `agent_settings` JSON NOT NULL,
    `voice_settings` JSON NOT NULL,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_project_configs_project_id` (`project_id`),
    CONSTRAINT `fk_project_configs_project_id` FOREIGN KEY (`project_id`) REFERENCES `projects` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- Table: knowledge_docs
-- ----------------------------------------------------------------------------
DROP TABLE IF EXISTS `knowledge_docs`;
CREATE TABLE `knowledge_docs` (
    `id` VARCHAR(36) NOT NULL,
    `org_id` VARCHAR(36) NOT NULL,
    `project_id` VARCHAR(36) NOT NULL,
    `filename` VARCHAR(255) NOT NULL,
    `file_path` VARCHAR(512) NOT NULL,
    `file_size` INT NOT NULL DEFAULT 0,
    `collection_name` VARCHAR(255) NOT NULL,
    `status` VARCHAR(50) NOT NULL DEFAULT 'pending',
    `doc_metadata` JSON NOT NULL,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    KEY `idx_knowledge_docs_org_id` (`org_id`),
    KEY `idx_knowledge_docs_project_id` (`project_id`),
    CONSTRAINT `fk_knowledge_docs_org_id` FOREIGN KEY (`org_id`) REFERENCES `organizations` (`id`) ON DELETE CASCADE,
    CONSTRAINT `fk_knowledge_docs_project_id` FOREIGN KEY (`project_id`) REFERENCES `projects` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- Table: api_integrations
-- ----------------------------------------------------------------------------
DROP TABLE IF EXISTS `api_integrations`;
CREATE TABLE `api_integrations` (
    `id` VARCHAR(36) NOT NULL,
    `org_id` VARCHAR(36) NOT NULL,
    `project_id` VARCHAR(36) NOT NULL,
    `name` VARCHAR(255) NOT NULL,
    `base_url` VARCHAR(512) NOT NULL,
    `auth_type` VARCHAR(50) NOT NULL DEFAULT 'none',
    `encrypted_secret` TEXT DEFAULT NULL,
    `endpoints` JSON NOT NULL,
    `is_enabled` TINYINT(1) NOT NULL DEFAULT 1,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    KEY `idx_api_integrations_org_id` (`org_id`),
    KEY `idx_api_integrations_project_id` (`project_id`),
    CONSTRAINT `fk_api_integrations_org_id` FOREIGN KEY (`org_id`) REFERENCES `organizations` (`id`) ON DELETE CASCADE,
    CONSTRAINT `fk_api_integrations_project_id` FOREIGN KEY (`project_id`) REFERENCES `projects` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- Table: conversations
-- ----------------------------------------------------------------------------
DROP TABLE IF EXISTS `conversations`;
CREATE TABLE `conversations` (
    `id` VARCHAR(36) NOT NULL,
    `org_id` VARCHAR(36) NOT NULL,
    `project_id` VARCHAR(36) NOT NULL,
    `user_id` VARCHAR(36) DEFAULT NULL,
    `session_id` VARCHAR(255) NOT NULL,
    `channel` VARCHAR(50) NOT NULL DEFAULT 'chat',
    `status` VARCHAR(50) NOT NULL DEFAULT 'active',
    `intent_summary` VARCHAR(255) DEFAULT NULL,
    `sentiment` VARCHAR(50) DEFAULT NULL,
    `start_time` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `end_time` DATETIME DEFAULT NULL,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_conversations_session_id` (`session_id`),
    KEY `idx_conversations_org_id` (`org_id`),
    KEY `idx_conversations_project_id` (`project_id`),
    KEY `idx_conversations_user_id` (`user_id`),
    CONSTRAINT `fk_conversations_org_id` FOREIGN KEY (`org_id`) REFERENCES `organizations` (`id`) ON DELETE CASCADE,
    CONSTRAINT `fk_conversations_project_id` FOREIGN KEY (`project_id`) REFERENCES `projects` (`id`) ON DELETE CASCADE,
    CONSTRAINT `fk_conversations_user_id` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- Table: messages
-- ----------------------------------------------------------------------------
DROP TABLE IF EXISTS `messages`;
CREATE TABLE `messages` (
    `id` VARCHAR(36) NOT NULL,
    `conversation_id` VARCHAR(36) NOT NULL,
    `org_id` VARCHAR(36) NOT NULL,
    `project_id` VARCHAR(36) NOT NULL,
    `sender_type` VARCHAR(50) NOT NULL,
    `content` TEXT NOT NULL,
    `tokens_used` INT NOT NULL DEFAULT 0,
    `latency_ms` INT NOT NULL DEFAULT 0,
    `tool_calls` JSON NOT NULL,
    `is_flagged` TINYINT(1) NOT NULL DEFAULT 0,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    KEY `idx_messages_conversation_id` (`conversation_id`),
    KEY `idx_messages_org_id` (`org_id`),
    KEY `idx_messages_project_id` (`project_id`),
    CONSTRAINT `fk_messages_conversation_id` FOREIGN KEY (`conversation_id`) REFERENCES `conversations` (`id`) ON DELETE CASCADE,
    CONSTRAINT `fk_messages_org_id` FOREIGN KEY (`org_id`) REFERENCES `organizations` (`id`) ON DELETE CASCADE,
    CONSTRAINT `fk_messages_project_id` FOREIGN KEY (`project_id`) REFERENCES `projects` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- Table: audit_logs
-- ----------------------------------------------------------------------------
DROP TABLE IF EXISTS `audit_logs`;
CREATE TABLE `audit_logs` (
    `id` VARCHAR(36) NOT NULL,
    `org_id` VARCHAR(36) DEFAULT NULL,
    `user_id` VARCHAR(36) DEFAULT NULL,
    `action` VARCHAR(255) NOT NULL,
    `resource_type` VARCHAR(100) NOT NULL,
    `resource_id` VARCHAR(255) DEFAULT NULL,
    `details` JSON NOT NULL,
    `ip_address` VARCHAR(50) DEFAULT NULL,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    KEY `idx_audit_logs_org_id` (`org_id`),
    KEY `idx_audit_logs_user_id` (`user_id`),
    KEY `idx_audit_logs_action` (`action`),
    KEY `idx_audit_logs_created_at` (`created_at`),
    CONSTRAINT `fk_audit_logs_org_id` FOREIGN KEY (`org_id`) REFERENCES `organizations` (`id`) ON DELETE CASCADE,
    CONSTRAINT `fk_audit_logs_user_id` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET FOREIGN_KEY_CHECKS = 1;

-- ============================================================================
-- SEED DATA INSERTS
-- ============================================================================

-- 1. Seed Organization
INSERT INTO `organizations` (`id`, `name`, `slug`, `status`)
VALUES ('11111111-1111-1111-1111-111111111111', 'Primary Financial Services Org', 'primary-financial-org', 'active')
ON DUPLICATE KEY UPDATE `name` = VALUES(`name`);

-- 2. Seed Super Admin User (admin@bfsi.com / admin123)
-- Password Hash generated using bcrypt for "admin123"
INSERT INTO `users` (`id`, `org_id`, `email`, `password_hash`, `full_name`, `role`, `is_active`)
VALUES ('33333333-3333-3333-3333-333333333333', NULL, 'admin@bfsi.com', '$2b$12$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW', 'Platform Super Admin', 'super_admin', 1)
ON DUPLICATE KEY UPDATE `email` = VALUES(`email`);

-- 3. Seed Lead User (lead@bfsi.com / lead123)
INSERT INTO `users` (`id`, `org_id`, `email`, `password_hash`, `full_name`, `role`, `is_active`)
VALUES ('44444444-4444-4444-4444-444444444444', '11111111-1111-1111-1111-111111111111', 'lead@bfsi.com', '$2b$12$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW', 'Lead Financial Advisor', 'lead', 1)
ON DUPLICATE KEY UPDATE `email` = VALUES(`email`);

-- 4. Seed Supervisor User (supervisor@bfsi.com / supervisor123)
INSERT INTO `users` (`id`, `org_id`, `email`, `password_hash`, `full_name`, `role`, `is_active`)
VALUES ('66666666-6666-6666-6666-666666666666', '11111111-1111-1111-1111-111111111111', 'supervisor@bfsi.com', '$2b$12$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW', 'BFSI Operations Supervisor', 'supervisor', 1)
ON DUPLICATE KEY UPDATE `email` = VALUES(`email`);

-- 5. Seed Primary Project (Banking Operations Assistant)
INSERT INTO `projects` (`id`, `org_id`, `name`, `domain`, `status`)
VALUES ('22222222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111', 'Banking Operations Assistant', 'banking', 'active')
ON DUPLICATE KEY UPDATE `name` = VALUES(`name`);

-- 6. Seed Project Config
INSERT INTO `project_configs` (`id`, `project_id`, `system_prompt`, `guardrails`, `agent_settings`, `voice_settings`)
VALUES (
    '55555555-5555-5555-5555-555555555555',
    '22222222-2222-2222-2222-222222222222',
    'You are a professional BFSI Intelligent Assistant for Banking Operations.',
    '{"pii_masking": true, "blocked_topics": ["crypto gambling"], "required_disclaimers": ["Not financial advice"]}',
    '{"llm_model": "gpt-4o-mini", "temperature": 0.2}',
    '{"speed": 1.0, "tts_vendor": "elevenlabs", "voice_id": "21m00Tcm4TlvDq8ikWAM"}'
)
ON DUPLICATE KEY UPDATE `system_prompt` = VALUES(`system_prompt`);

-- ============================================================================
-- End of Schema & Seed Script
-- ============================================================================
