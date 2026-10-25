import React from 'react';
import { ThemeProvider } from './context/ThemeContext';
import { Navbar } from './components/Navbar';
import { HeroSection } from './components/HeroSection';
import { DemoVideoSection } from './components/DemoVideoSection';
import { WorkflowSection } from './components/WorkflowSection';
import { FeatureGrid } from './components/FeatureGrid';
import { ArchitectureSection } from './components/ArchitectureSection';
import { PricingSection } from './components/PricingSection';
import { CreatorsSection } from './components/CreatorsSection';
import { Footer } from './components/Footer';

export default function App() {
  return (
    <ThemeProvider>
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors duration-300 selection:bg-blue-600 selection:text-white flex flex-col font-sans">
        {/* Sticky Header Navigation */}
        <Navbar />

        {/* Main Landing Content */}
        <main className="flex-1">
          {/* 1. Hero with BFSI SaaS Positioning & High-Res Isometric Graphic */}
          <HeroSection />

          {/* 2. Two Demo Video Showcase Blocks (Admin Walkthrough & Client Experience) */}
          <DemoVideoSection />

          {/* 3. End-to-End Workflow: How Organizations & Clients Use the SaaS */}
          <WorkflowSection />

          {/* 4. Core Capabilities & Architecture Pillars */}
          <FeatureGrid />

          {/* 5. Runtime Execution Pipeline & Swagger Docs */}
          <ArchitectureSection />

          {/* 6. Pricing Plans & Billing */}
          <PricingSection />

          {/* 7. Co-Creators & Engineering Attribution (Rakesh Rohan & Shaik Fayaz Ahammad) */}
          <CreatorsSection />
        </main>

        {/* Global Footer */}
        <Footer />
      </div>
    </ThemeProvider>
  );
}
