"""Initial schema creation and seed data migration

Revision ID: 0001_initial_schema
Revises: 
Create Date: 2026-10-04 12:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql
import uuid
from datetime import datetime
from app.core.security import hash_password

revision = '0001_initial_schema'
down_revision = None
branch_labels = None
depends_on = None

def upgrade() -> None:
    # 1. Create Organizations table
    op.create_table(
        'organizations',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('name', sa.String(length=255), nullable=False),
        sa.Column('slug', sa.String(length=255), nullable=False),
        sa.Column('status', sa.String(length=50), nullable=False, server_default='active'),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('slug')
    )
    op.create_index(op.f('ix_organizations_slug'), 'organizations', ['slug'], unique=True)

    # 2. Create Users table
    op.create_table(
        'users',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('org_id', sa.String(length=36), nullable=True),
        sa.Column('email', sa.String(length=255), nullable=False),
        sa.Column('password_hash', sa.String(length=255), nullable=False),
        sa.Column('full_name', sa.String(length=255), nullable=False),
        sa.Column('role', sa.String(length=50), nullable=False, server_default='lead'),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['org_id'], ['organizations.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('email')
    )
    op.create_index(op.f('ix_users_email'), 'users', ['email'], unique=True)
    op.create_index(op.f('ix_users_org_id'), 'users', ['org_id'], unique=False)

    # 3. Create Projects table
    op.create_table(
        'projects',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('org_id', sa.String(length=36), nullable=False),
        sa.Column('name', sa.String(length=255), nullable=False),
        sa.Column('domain', sa.String(length=50), nullable=False),
        sa.Column('status', sa.String(length=50), nullable=False, server_default='active'),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['org_id'], ['organizations.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_projects_org_id'), 'projects', ['org_id'], unique=False)

    # 4. Create Project Configs table
    op.create_table(
        'project_configs',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('project_id', sa.String(length=36), nullable=False),
        sa.Column('system_prompt', sa.Text(), nullable=False),
        sa.Column('guardrails', sa.JSON(), nullable=False),
        sa.Column('agent_settings', sa.JSON(), nullable=False),
        sa.Column('voice_settings', sa.JSON(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['project_id'], ['projects.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('project_id')
    )
    op.create_index(op.f('ix_project_configs_project_id'), 'project_configs', ['project_id'], unique=True)

    # 5. Create Knowledge Docs table
    op.create_table(
        'knowledge_docs',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('org_id', sa.String(length=36), nullable=False),
        sa.Column('project_id', sa.String(length=36), nullable=False),
        sa.Column('filename', sa.String(length=255), nullable=False),
        sa.Column('file_path', sa.String(length=512), nullable=False),
        sa.Column('file_size', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('collection_name', sa.String(length=255), nullable=False),
        sa.Column('status', sa.String(length=50), nullable=False, server_default='pending'),
        sa.Column('doc_metadata', sa.JSON(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['org_id'], ['organizations.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['project_id'], ['projects.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )

    # 6. Create API Integrations table
    op.create_table(
        'api_integrations',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('org_id', sa.String(length=36), nullable=False),
        sa.Column('project_id', sa.String(length=36), nullable=False),
        sa.Column('name', sa.String(length=255), nullable=False),
        sa.Column('base_url', sa.String(length=512), nullable=False),
        sa.Column('auth_type', sa.String(length=50), nullable=False, server_default='none'),
        sa.Column('encrypted_secret', sa.Text(), nullable=True),
        sa.Column('endpoints', sa.JSON(), nullable=False),
        sa.Column('is_enabled', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['org_id'], ['organizations.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['project_id'], ['projects.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )

    # 7. Create Conversations table
    op.create_table(
        'conversations',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('org_id', sa.String(length=36), nullable=False),
        sa.Column('project_id', sa.String(length=36), nullable=False),
        sa.Column('user_id', sa.String(length=36), nullable=True),
        sa.Column('session_id', sa.String(length=255), nullable=False),
        sa.Column('channel', sa.String(length=50), nullable=False, server_default='chat'),
        sa.Column('status', sa.String(length=50), nullable=False, server_default='active'),
        sa.Column('intent_summary', sa.String(length=255), nullable=True),
        sa.Column('sentiment', sa.String(length=50), nullable=True),
        sa.Column('start_time', sa.DateTime(), nullable=False),
        sa.Column('end_time', sa.DateTime(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['org_id'], ['organizations.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['project_id'], ['projects.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('session_id')
    )

    # 8. Create Messages table
    op.create_table(
        'messages',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('conversation_id', sa.String(length=36), nullable=False),
        sa.Column('org_id', sa.String(length=36), nullable=False),
        sa.Column('project_id', sa.String(length=36), nullable=False),
        sa.Column('sender_type', sa.String(length=50), nullable=False),
        sa.Column('content', sa.Text(), nullable=False),
        sa.Column('tokens_used', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('latency_ms', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('tool_calls', sa.JSON(), nullable=False),
        sa.Column('is_flagged', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['conversation_id'], ['conversations.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['org_id'], ['organizations.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['project_id'], ['projects.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )

    # --- SEED INITIAL DATA (Existing Client -> Organization #1, Project #1) ---
    org_id = '11111111-1111-1111-1111-111111111111'
    project_id = '22222222-2222-2222-2222-222222222222'
    now = datetime.utcnow()

    op.execute(
        sa.text(f"""
            INSERT INTO organizations (id, name, slug, status, created_at, updated_at)
            VALUES ('{org_id}', 'Primary Financial Services Org', 'primary-financial-org', 'active', '{now}', '{now}')
        """)
    )

    # Super Admin User (admin@bfsi.com / admin123)
    admin_id = '33333333-3333-3333-3333-333333333333'
    admin_pass = hash_password('admin123')
    op.execute(
        sa.text(f"""
            INSERT INTO users (id, org_id, email, password_hash, full_name, role, is_active, created_at, updated_at)
            VALUES ('{admin_id}', NULL, 'admin@bfsi.com', '{admin_pass}', 'Platform Super Admin', 'super_admin', true, '{now}', '{now}')
        """)
    )

    # Lead Client User (lead@bfsi.com / lead123)
    lead_id = '44444444-4444-4444-4444-444444444444'
    lead_pass = hash_password('lead123')
    op.execute(
        sa.text(f"""
            INSERT INTO users (id, org_id, email, password_hash, full_name, role, is_active, created_at, updated_at)
            VALUES ('{lead_id}', '{org_id}', 'lead@bfsi.com', '{lead_pass}', 'Lead Financial Advisor', 'lead', true, '{now}', '{now}')
        """)
    )

    # Default Project #1 (Banking Operations)
    op.execute(
        sa.text(f"""
            INSERT INTO projects (id, org_id, name, domain, status, created_at, updated_at)
            VALUES ('{project_id}', '{org_id}', 'Banking Operations Assistant', 'banking', 'active', '{now}', '{now}')
        """)
    )

    # Project Config
    config_id = '55555555-5555-5555-5555-555555555555'
    prompt = "You are a professional BFSI Intelligent Assistant for Banking Operations. Help users with balance checks, card block requests, loan FAQs, and customer support."
    guardrails_json = '{"blocked_topics": ["crypto gambling", "unauthorized transfers"], "required_disclaimers": ["Not financial advice"], "pii_masking": true, "escalation_rules": {"negative_sentiment_turns": 2}}'
    agent_settings_json = '{"llm_model": "gpt-4o-mini", "temperature": 0.2, "max_tokens": 1000}'
    voice_settings_json = '{"tts_vendor": "elevenlabs", "voice_id": "21m00Tcm4TlvDq8ikWAM", "speed": 1.0, "stability": 0.75}'

    op.execute(
        sa.text(f"""
            INSERT INTO project_configs (id, project_id, system_prompt, guardrails, agent_settings, voice_settings, created_at, updated_at)
            VALUES ('{config_id}', '{project_id}', '{prompt}', '{guardrails_json}', '{agent_settings_json}', '{voice_settings_json}', '{now}', '{now}')
        """)
    )


def downgrade() -> None:
    op.drop_table('messages')
    op.drop_table('conversations')
    op.drop_table('api_integrations')
    op.drop_table('knowledge_docs')
    op.drop_table('project_configs')
    op.drop_table('projects')
    op.drop_table('users')
    op.drop_table('organizations')
