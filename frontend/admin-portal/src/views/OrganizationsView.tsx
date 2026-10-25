import React, { useState } from 'react';
import { adminApi } from '../services/api';
import type { Organization } from '../types';

interface OrganizationsViewProps {
  orgs: Organization[];
  selectedOrgId: string;
  onOrgsUpdate: (selectOrgId?: string) => void;
  onMessage: (msg: string, type?: 'success' | 'error') => void;
}

export default function OrganizationsView({
  orgs, selectedOrgId, onOrgsUpdate, onMessage
}: OrganizationsViewProps) {
  // Org creation
  const [orgName, setOrgName] = useState('');
  const [orgSlug, setOrgSlug] = useState('');
  const [orgLoading, setOrgLoading] = useState(false);

  // User creation
  const [userEmail, setUserEmail] = useState('');
  const [userPassword, setUserPassword] = useState('');
  const [userFullName, setUserFullName] = useState('');
  const [userRole, setUserRole] = useState('lead');
  const [userLoading, setUserLoading] = useState(false);

  const handleCreateOrg = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orgName.trim() || !orgSlug.trim()) return;
    setOrgLoading(true);
    try {
      const created = await adminApi.createOrg(orgName.trim(), orgSlug.trim());
      setOrgName(''); setOrgSlug('');
      onOrgsUpdate(created.id);
      onMessage(`✅ Organization "${orgName}" created successfully and selected!`, 'success');
    } catch (err: any) {
      onMessage(err?.response?.data?.detail || 'Failed to create organization', 'error');
    } finally {
      setOrgLoading(false);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrgId || !userEmail.trim()) return;
    setUserLoading(true);
    try {
      await adminApi.createOrgUser(selectedOrgId, {
        email: userEmail.trim(),
        password: userPassword,
        full_name: userFullName.trim(),
        role: userRole,
      });
      setUserEmail(''); setUserPassword(''); setUserFullName('');
      onMessage(`✅ User "${userFullName}" onboarded with role "${userRole}"`, 'success');
    } catch (err: any) {
      onMessage(err?.response?.data?.detail || 'Failed to create user', 'error');
    } finally {
      setUserLoading(false);
    }
  };

  const selectedOrg = orgs.find((o) => o.id === selectedOrgId);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div className="section-header">
        <div>
          <div className="section-title">Organizations & Credentials</div>
          <div className="section-subtitle">Manage tenant organizations and onboard client users</div>
        </div>
        <div className="badge badge-indigo">{orgs.length} Organizations</div>
      </div>

      <div className="grid-2">
        {/* Create Organization */}
        <div className="card">
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--color-text-primary)', display: 'flex', alignItems: 'center', gap: 8 }}>
              <span>🏢</span> Create New Organization
            </div>
            <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 4 }}>
              Register a new tenant organization on the BFSI platform
            </div>
          </div>
          <form onSubmit={handleCreateOrg} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div className="form-group">
              <label className="form-label">Organization Name</label>
              <input
                className="form-input"
                type="text"
                placeholder="e.g. Standard Chartered Bank"
                value={orgName}
                onChange={(e) => {
                  setOrgName(e.target.value);
                  if (!orgSlug) setOrgSlug(e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''));
                }}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">Slug (unique identifier)</label>
              <input
                className="form-input"
                type="text"
                placeholder="e.g. standard-chartered"
                value={orgSlug}
                onChange={(e) => setOrgSlug(e.target.value)}
                required
              />
            </div>
            <button type="submit" className="btn btn-primary btn-full" disabled={orgLoading}>
              {orgLoading ? <><div className="spinner" /> Creating…</> : '🏢 Create Organization'}
            </button>
          </form>
        </div>

        {/* Organizations List */}
        <div className="card">
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--color-text-primary)' }}>Registered Organizations</div>
            <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 4 }}>All tenant organizations on this platform</div>
          </div>
          {orgs.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">🏢</div>
              <div className="empty-state-title">No organizations yet</div>
              <div className="empty-state-desc">Create your first organization to get started</div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {orgs.map((org) => (
                <div key={org.id} style={{
                  padding: '12px 14px', borderRadius: 12,
                  background: org.id === selectedOrgId ? 'rgba(99,102,241,0.08)' : 'rgba(255,255,255,0.025)',
                  border: `1px solid ${org.id === selectedOrgId ? 'rgba(99,102,241,0.3)' : 'rgba(255,255,255,0.06)'}`,
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  transition: 'all 0.15s',
                }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-primary)' }}>
                      {org.name}
                      {org.id === selectedOrgId && <span style={{ fontSize: 10, marginLeft: 8, color: '#818cf8' }}>● Active</span>}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--color-text-muted)', fontFamily: 'JetBrains Mono, monospace', marginTop: 2 }}>
                      /{org.slug} · {org.project_count ?? 0} projects · {org.user_count ?? 0} users
                    </div>
                  </div>
                  <div className={`badge badge-${org.status === 'active' ? 'emerald' : 'amber'}`}>
                    {org.status}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Credential / User Onboarding */}
      <div className="grid-2">
        <div className="card">
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--color-text-primary)', display: 'flex', alignItems: 'center', gap: 8 }}>
              <span>👤</span> Onboard Client User
            </div>
            <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 4 }}>
              Create credentialed user for:{' '}
              <strong style={{ color: 'var(--color-text-accent)' }}>
                {selectedOrg?.name || 'Selected Organization'}
              </strong>
            </div>
          </div>
          <form onSubmit={handleCreateUser} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div className="form-group">
              <label className="form-label">Full Name</label>
              <input className="form-input" type="text" placeholder="e.g. Rahul Sharma" value={userFullName} onChange={(e) => setUserFullName(e.target.value)} required />
            </div>
            <div className="form-group">
              <label className="form-label">Email Address</label>
              <input className="form-input" type="email" placeholder="user@bank.com" value={userEmail} onChange={(e) => setUserEmail(e.target.value)} required />
            </div>
            <div className="form-group">
              <label className="form-label">Temporary Password</label>
              <input className="form-input" type="password" placeholder="Minimum 8 characters" value={userPassword} onChange={(e) => setUserPassword(e.target.value)} required />
            </div>
            <div className="form-group">
              <label className="form-label">Access Role</label>
              <select className="form-select" value={userRole} onChange={(e) => setUserRole(e.target.value)}>
                <option value="supervisor">🔷 Supervisor — All org agents & analytics</option>
                <option value="lead">🔹 Lead Operator — Assigned agents only</option>
              </select>
            </div>
            <button type="submit" className="btn btn-primary btn-full" disabled={userLoading || !selectedOrgId}>
              {userLoading ? <><div className="spinner" /> Creating User…</> : '👤 Create Client User'}
            </button>
          </form>
        </div>

        {/* Role Reference */}
        <div className="card">
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--color-text-primary)' }}>Role Permissions Reference</div>
            <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 4 }}>Access levels on the BFSI Platform</div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {[
              {
                role: '👑 Super Admin', color: '#6366f1',
                perms: ['Full platform access', 'Manage all organizations', 'Create & delete agents', 'Access audit logs & analytics', 'Configure all settings'],
              },
              {
                role: '🔷 Supervisor', color: '#0ea5e9',
                perms: ['View all org agents', 'Read-only analytics', 'Monitor conversation logs', 'Access assigned org only'],
              },
              {
                role: '🔹 Lead Operator', color: '#10b981',
                perms: ['Assigned agents only', 'Handle escalations', 'View limited analytics', 'No configuration access'],
              },
            ].map(({ role, color, perms }) => (
              <div key={role} style={{ padding: '12px 14px', borderRadius: 10, background: `${color}0d`, border: `1px solid ${color}33` }}>
                <div style={{ fontSize: 13, fontWeight: 700, color, marginBottom: 8 }}>{role}</div>
                <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {perms.map((p) => (
                    <li key={p} style={{ fontSize: 11, color: 'var(--color-text-muted)', display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ color, fontSize: 8 }}>●</span>{p}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
