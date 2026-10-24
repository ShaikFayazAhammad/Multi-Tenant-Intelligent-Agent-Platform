import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import Sidebar from '../components/layout/Sidebar';
import type { NavItem } from '../types';

describe('Sidebar Navigation Tests', () => {
  it('renders all nav items including Visual Builder', () => {
    const handleNavChange = vi.fn();
    render(
      <Sidebar
        activeNav="dashboard"
        onNavChange={handleNavChange}
      />
    );

    // Verify sections and items
    expect(screen.getByText('BFSI Platform')).toBeDefined();
    expect(screen.getByText('Dashboard')).toBeDefined();
    expect(screen.getByText('Visual Builder')).toBeDefined();
    expect(screen.getByText('Orgs & Credentials')).toBeDefined();
    expect(screen.getByText('Projects & Agents')).toBeDefined();
    expect(screen.getByText('Configure Prompt')).toBeDefined();
    expect(screen.getByText('Knowledge Base')).toBeDefined();
    expect(screen.getByText('API Vault')).toBeDefined();
    expect(screen.getByText('Playground')).toBeDefined();
  });

  it('clicking Visual Builder triggers nav change to visual-builder', () => {
    const handleNavChange = vi.fn();
    render(
      <Sidebar
        activeNav="dashboard"
        onNavChange={handleNavChange}
      />
    );

    const vbBtn = screen.getByText('Visual Builder');
    fireEvent.click(vbBtn);
    expect(handleNavChange).toHaveBeenCalledWith('visual-builder');
  });
});
