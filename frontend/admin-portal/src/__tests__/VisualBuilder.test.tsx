import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import VisualBuilderView from '../views/VisualBuilderView';
import type { Organization, Project } from '../types';

const mockOrgs: Organization[] = [
  { id: 'org-111', name: 'Standard Chartered Global', slug: 'scb-global', status: 'active', user_count: 5, project_count: 2 },
  { id: 'org-222', name: 'HSBC Retail', slug: 'hsbc-retail', status: 'active', user_count: 2, project_count: 1 },
];

const mockProjects: Project[] = [
  { id: 'proj-aaa', org_id: 'org-111', name: 'Retail Banking Assistant', domain: 'banking', status: 'Live' },
  { id: 'proj-bbb', org_id: 'org-111', name: 'Wealth Advisory AI', domain: 'finance', status: 'Draft' },
];

describe('VisualBuilderView Component Tests', () => {
  it('renders the builder toolbar and metrics badges', () => {
    const handleMessage = vi.fn();
    render(
      <VisualBuilderView
        orgs={mockOrgs}
        selectedOrgId="org-111"
        onOrgChange={vi.fn()}
        projects={mockProjects}
        selectedProjectId="proj-aaa"
        onProjectSelect={vi.fn()}
        onOrgsUpdate={vi.fn()}
        onProjectsUpdate={vi.fn()}
        onMessage={handleMessage}
      />
    );

    // Toolbar Header
    expect(screen.getByText(/Visual Workflow Builder/)).toBeDefined();
    expect(screen.getByText(/Reload Hierarchy/)).toBeDefined();
    expect(screen.getByText(/Save Workflow/)).toBeDefined();
  });

  it('renders all palette blocks on the left panel', () => {
    render(
      <VisualBuilderView
        orgs={mockOrgs}
        selectedOrgId="org-111"
        onOrgChange={vi.fn()}
        projects={mockProjects}
        selectedProjectId="proj-aaa"
        onProjectSelect={vi.fn()}
        onOrgsUpdate={vi.fn()}
        onProjectsUpdate={vi.fn()}
        onMessage={vi.fn()}
      />
    );

    expect(screen.getByText('Add Blocks')).toBeDefined();
    expect(screen.getAllByText('Organization').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Project').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Agent').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Prompt & Config').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Knowledge Base').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('API Vault')).toBeDefined();
    expect(screen.getAllByText('Playground').length).toBeGreaterThanOrEqual(1);
  });

  it('auto-populates hierarchy nodes for selected organization and projects', () => {
    render(
      <VisualBuilderView
        orgs={mockOrgs}
        selectedOrgId="org-111"
        onOrgChange={vi.fn()}
        projects={mockProjects}
        selectedProjectId="proj-aaa"
        onProjectSelect={vi.fn()}
        onOrgsUpdate={vi.fn()}
        onProjectsUpdate={vi.fn()}
        onMessage={vi.fn()}
      />
    );

    // Org node title
    expect(screen.getAllByText('Standard Chartered Global').length).toBeGreaterThanOrEqual(1);

    // Project node titles
    expect(screen.getAllByText('Retail Banking Assistant').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Wealth Advisory AI').length).toBeGreaterThanOrEqual(1);

    // Lifecycle badges
    expect(screen.getAllByText(/Live/).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/Draft/).length).toBeGreaterThanOrEqual(1);
  });

  it('allows clicking a palette item to add a new block', () => {
    render(
      <VisualBuilderView
        orgs={mockOrgs}
        selectedOrgId="org-111"
        onOrgChange={vi.fn()}
        projects={mockProjects}
        selectedProjectId="proj-aaa"
        onProjectSelect={vi.fn()}
        onOrgsUpdate={vi.fn()}
        onProjectsUpdate={vi.fn()}
        onMessage={vi.fn()}
      />
    );

    // Click on "Playground" palette item
    const pgPaletteItem = screen.getByTitle('Click to add Playground');
    fireEvent.click(pgPaletteItem);

    // Should now have Playground nodes on the canvas
    const pgNodes = screen.getAllByText(/Playground/);
    expect(pgNodes.length).toBeGreaterThanOrEqual(1);
  });

  it('triggers save workflow message notification', () => {
    const handleMessage = vi.fn();
    render(
      <VisualBuilderView
        orgs={mockOrgs}
        selectedOrgId="org-111"
        onOrgChange={vi.fn()}
        projects={mockProjects}
        selectedProjectId="proj-aaa"
        onProjectSelect={vi.fn()}
        onOrgsUpdate={vi.fn()}
        onProjectsUpdate={vi.fn()}
        onMessage={handleMessage}
      />
    );

    const saveBtn = screen.getByText(/Save Workflow/);
    fireEvent.click(saveBtn);
    expect(handleMessage).toHaveBeenCalledWith(expect.stringContaining('Workflow saved'), 'success');
  });

  it('clicking a node opens the right panel drawer with form and can be closed', () => {
    render(
      <VisualBuilderView
        orgs={mockOrgs}
        selectedOrgId="org-111"
        onOrgChange={vi.fn()}
        projects={mockProjects}
        selectedProjectId="proj-aaa"
        onProjectSelect={vi.fn()}
        onOrgsUpdate={vi.fn()}
        onProjectsUpdate={vi.fn()}
        onMessage={vi.fn()}
      />
    );

    // Right drawer should initially not be open (no Close Panel button)
    expect(screen.queryByTitle(/Close Panel/)).toBeNull();

    // Click "Manage Org & Users" on the Org card
    const configureBtn = screen.getByText(/Manage Org & Users/);
    fireEvent.click(configureBtn);

    // Right drawer should now be open
    expect(screen.getByTitle(/Close Panel/)).toBeDefined();
    expect(screen.getByText(/Onboard Operator \/ User Credentials/)).toBeDefined();

    // Click the close button
    const closeBtn = screen.getByTitle(/Close Panel/);
    fireEvent.click(closeBtn);

    // Right drawer should now be closed
    expect(screen.queryByTitle(/Close Panel/)).toBeNull();
  });
});
