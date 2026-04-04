import { Link } from 'react-router-dom';
import { useState } from 'react';
import { SectionHeading } from '../components';

const sidebarItems = ['Care Hub', 'Records', 'Care Circle', 'Settings'];
const bottomNavItems = [
  { label: 'Home', icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
  { label: 'Records', icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z' },
  { label: 'Circle', icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z' },
];

export default function PreviewNavigation() {
  const [activeTab, setActiveTab] = useState('care');
  const [activeSidebar, setActiveSidebar] = useState('Care Hub');
  const [activeBottomNav, setActiveBottomNav] = useState('Home');

  return (
    <div className="p-8">
      <div className="max-w-4xl mx-auto">
        <Link to="/" className="text-sm mb-4 inline-block" style={{ color: 'var(--p-orange)' }}>&larr; Back to gallery</Link>
        <h1 className="text-3xl font-semibold mb-2" style={{ color: 'var(--p-text)' }}>Navigation</h1>
        <p className="text-lg mb-8" style={{ color: 'var(--p-text-body)' }}>Orange = active/clickable. Inactive = slate. Click items to see state changes.</p>

        {/* Tabs */}
        <div className="rounded-2xl p-6 mb-8" style={{ backgroundColor: 'var(--p-surface)', border: '1px solid var(--p-border)' }}>
          <SectionHeading className="mb-4">Tabs</SectionHeading>
          <div style={{ borderBottom: '1px solid var(--p-border)' }}>
            <div className="flex gap-0">
              {['care', 'records', 'circle'].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className="px-4 py-3 text-base font-medium min-h-[44px] transition-colors duration-[50ms]"
                  style={{
                    color: activeTab === tab ? 'var(--p-orange)' : 'var(--p-text-muted)',
                    borderBottom: activeTab === tab ? '2px solid var(--p-orange)' : '2px solid transparent',
                  }}
                >
                  {tab.charAt(0).toUpperCase() + tab.slice(1)}
                </button>
              ))}
            </div>
          </div>
          <div className="py-4 text-base" style={{ color: 'var(--p-text-body)' }}>
            Active tab: <span className="font-medium" style={{ color: 'var(--p-text)' }}>{activeTab}</span> — content swaps instantly (0ms)
          </div>
        </div>

        {/* Breadcrumbs */}
        <div className="rounded-2xl p-6 mb-8" style={{ backgroundColor: 'var(--p-surface)', border: '1px solid var(--p-border)' }}>
          <SectionHeading className="mb-4">Breadcrumbs</SectionHeading>
          <nav className="flex items-center gap-2 text-sm">
            <a href="#" style={{ color: 'var(--p-orange)' }} className="hover:underline">Home</a>
            <span style={{ color: 'var(--p-text-faint)' }}>/</span>
            <a href="#" style={{ color: 'var(--p-orange)' }} className="hover:underline">Records</a>
            <span style={{ color: 'var(--p-text-faint)' }}>/</span>
            <span className="font-medium" style={{ color: 'var(--p-text)' }}>Blood Work — March 2026</span>
          </nav>
          <p className="text-xs mt-3" style={{ color: 'var(--p-text-faint)' }}>Previous pages = orange (clickable). Current = primary text (not clickable).</p>
        </div>

        {/* Sidebar Nav Item */}
        <div className="rounded-2xl p-6 mb-8" style={{ backgroundColor: 'var(--p-surface)', border: '1px solid var(--p-border)' }}>
          <SectionHeading className="mb-4">Sidebar Items (Desktop Only)</SectionHeading>
          <div className="w-64 space-y-1">
            {sidebarItems.map((item) => {
              const isActive = activeSidebar === item;
              return (
                <button
                  key={item}
                  onClick={() => setActiveSidebar(item)}
                  className="block w-full text-left py-2 px-3 rounded-lg font-medium transition-colors duration-[50ms]"
                  style={{
                    backgroundColor: isActive ? 'var(--p-orange-light)' : 'transparent',
                    color: isActive ? 'var(--p-orange)' : 'var(--p-text-body)',
                  }}
                  onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.backgroundColor = 'var(--p-surface-hover)'; }}
                  onMouseLeave={(e) => { if (!isActive) e.currentTarget.style.backgroundColor = 'transparent'; }}
                >
                  {item}
                </button>
              );
            })}
          </div>
          <p className="text-xs mt-3" style={{ color: 'var(--p-text-faint)' }}>Click to switch active item. Active = orange bg + text. Hover = subtle surface.</p>
        </div>

        {/* Bottom Nav */}
        <div className="rounded-2xl p-6" style={{ backgroundColor: 'var(--p-surface)', border: '1px solid var(--p-border)' }}>
          <SectionHeading className="mb-4">Bottom Navigation (Mobile)</SectionHeading>
          <div className="flex justify-around items-stretch h-16 rounded-b-xl" style={{ backgroundColor: 'var(--p-surface)', borderTop: '1px solid var(--p-border)' }}>
            {bottomNavItems.map((item) => {
              const isActive = activeBottomNav === item.label;
              return (
                <button
                  key={item.label}
                  onClick={() => setActiveBottomNav(item.label)}
                  className="flex flex-col items-center gap-1 min-w-[44px] justify-center relative"
                  style={{ borderTop: isActive ? '2px solid var(--p-orange)' : '2px solid transparent' }}
                >
                  <svg className="w-5 h-5" style={{ color: isActive ? 'var(--p-orange)' : 'var(--p-text-faint)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={item.icon} /></svg>
                  <span className={`text-xs ${isActive ? 'font-medium' : ''}`} style={{ color: isActive ? 'var(--p-orange)' : 'var(--p-text-faint)' }}>{item.label}</span>
                </button>
              );
            })}
          </div>
          <p className="text-xs mt-3" style={{ color: 'var(--p-text-faint)' }}>Click to switch. Active = orange icon + text. Inactive = faint.</p>
        </div>
      </div>
    </div>
  );
}
