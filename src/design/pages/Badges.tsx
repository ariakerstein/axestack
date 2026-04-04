import { Link } from 'react-router-dom';
import { MetricDisplay, SectionHeading } from '../components';

export default function PreviewBadges() {
  return (
    <div className="p-8">
      <div className="max-w-4xl mx-auto">
        <Link to="/" className="text-sm mb-4 inline-block" style={{ color: 'var(--p-orange)' }}>&larr; Back to gallery</Link>
        <h1 className="text-3xl font-semibold mb-2" style={{ color: 'var(--p-text)' }}>Badges & Data Display</h1>
        <p className="text-lg mb-8" style={{ color: 'var(--p-text-body)' }}>No orange badges. Badges are informational, not interactive.</p>

        {/* Badge Variants */}
        <div className="rounded-2xl p-6 mb-8" style={{ backgroundColor: 'var(--p-surface)', border: '1px solid var(--p-border)' }}>
          <SectionHeading className="mb-4">Badge Variants</SectionHeading>
          <div className="flex flex-wrap gap-3">
            <span className="rounded-full px-3 py-1 text-xs font-medium" style={{ backgroundColor: 'var(--p-badge-default-bg)', color: 'var(--p-badge-default-text)' }}>Default</span>
            <span className="rounded-full px-3 py-1 text-xs font-medium" style={{ backgroundColor: 'var(--p-badge-green-bg)', color: 'var(--p-badge-green-text)' }}>Verified</span>
            <span className="rounded-full px-3 py-1 text-xs font-medium" style={{ backgroundColor: 'var(--p-badge-green-bg)', color: 'var(--p-badge-green-text)' }}>Complete</span>
            <span className="rounded-full px-3 py-1 text-xs font-medium" style={{ backgroundColor: 'var(--p-badge-red-bg)', color: 'var(--p-badge-red-text)' }}>Missing</span>
            <span className="rounded-full px-3 py-1 text-xs font-medium" style={{ backgroundColor: 'var(--p-badge-red-bg)', color: 'var(--p-badge-red-text)' }}>Overdue</span>
            <span className="rounded-full px-3 py-1 text-xs font-medium" style={{ backgroundColor: 'var(--p-badge-blue-bg)', color: 'var(--p-badge-blue-text)' }}>New</span>
            <span className="rounded-full px-3 py-1 text-xs font-medium" style={{ backgroundColor: 'var(--p-badge-blue-bg)', color: 'var(--p-badge-blue-text)' }}>Pending</span>
            <span className="rounded-full px-3 py-1 text-xs font-medium" style={{ backgroundColor: 'var(--p-badge-violet-bg)', color: 'var(--p-badge-violet-text)' }}>Care Circle</span>
            <span className="rounded-full px-3 py-1 text-xs font-medium" style={{ backgroundColor: 'var(--p-badge-violet-bg)', color: 'var(--p-badge-violet-text)' }}>Caregiver</span>
          </div>
          <p className="text-xs mt-3" style={{ color: 'var(--p-text-faint)' }}>px-3 py-1 padding. No orange or amber badges. Max 2 badges per element.</p>
        </div>

        {/* Badge in context */}
        <div className="rounded-2xl p-6 mb-8" style={{ backgroundColor: 'var(--p-surface)', border: '1px solid var(--p-border)' }}>
          <SectionHeading className="mb-4">Badges in Context</SectionHeading>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 rounded-xl" style={{ backgroundColor: 'var(--p-surface-alt)' }}>
              <div>
                <p className="font-medium" style={{ color: 'var(--p-text)' }}>BRCA1/2 Testing</p>
                <p className="text-sm" style={{ color: 'var(--p-text-muted)' }}>Recommended for breast cancer</p>
              </div>
              <span className="rounded-full px-3 py-1 text-xs font-medium" style={{ backgroundColor: 'var(--p-badge-red-bg)', color: 'var(--p-badge-red-text)' }}>Missing</span>
            </div>
            <div className="flex items-center justify-between p-4 rounded-xl" style={{ backgroundColor: 'var(--p-surface-alt)' }}>
              <div>
                <p className="font-medium" style={{ color: 'var(--p-text)' }}>HER2 Status</p>
                <p className="text-sm" style={{ color: 'var(--p-text-muted)' }}>Pathology confirmed</p>
              </div>
              <span className="rounded-full px-3 py-1 text-xs font-medium" style={{ backgroundColor: 'var(--p-badge-green-bg)', color: 'var(--p-badge-green-text)' }}>Complete</span>
            </div>
          </div>
        </div>

        {/* Avatars */}
        <div className="rounded-2xl p-6 mb-8" style={{ backgroundColor: 'var(--p-surface)', border: '1px solid var(--p-border)' }}>
          <SectionHeading className="mb-4">Avatars (Care Circle)</SectionHeading>
          <div className="flex items-center gap-4">
            <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold" style={{ backgroundColor: 'var(--p-violet-light)', color: 'var(--p-violet)' }}>SM</div>
            <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold" style={{ backgroundColor: 'var(--p-violet-light)', color: 'var(--p-violet)' }}>SM</div>
            <div className="w-14 h-14 rounded-full flex items-center justify-center text-lg font-semibold" style={{ backgroundColor: 'var(--p-violet-light)', color: 'var(--p-violet)' }}>SM</div>
            <div className="flex -space-x-2">
              <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold" style={{ backgroundColor: 'var(--p-violet-light)', color: 'var(--p-violet)', border: '2px solid var(--p-surface)' }}>AB</div>
              <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold" style={{ backgroundColor: 'var(--p-violet-light)', color: 'var(--p-violet)', border: '2px solid var(--p-surface)' }}>CD</div>
              <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold" style={{ backgroundColor: 'var(--p-violet-light)', color: 'var(--p-violet)', border: '2px solid var(--p-surface)' }}>EF</div>
              <div className="w-10 h-10 rounded-full flex items-center justify-center text-xs font-medium" style={{ backgroundColor: 'var(--p-badge-default-bg)', color: 'var(--p-text-muted)', border: '2px solid var(--p-surface)' }}>+3</div>
            </div>
          </div>
          <p className="text-xs mt-3" style={{ color: 'var(--p-text-faint)' }}>Violet for Care Circle. Sizes: sm (32px), md (40px), lg (56px). Group: max 4 visible + overflow.</p>
        </div>

        {/* Metrics */}
        <div className="rounded-2xl p-6 mb-8" style={{ backgroundColor: 'var(--p-surface)', border: '1px solid var(--p-border)' }}>
          <SectionHeading className="mb-4">Metric Display</SectionHeading>
          <div className="grid grid-cols-3 gap-4 mb-6">
            <MetricDisplay value="3" label="Tests Missing" />
            <MetricDisplay value="24h" label="Avg Response" />
            <MetricDisplay value="12" label="Trials Matched" />
          </div>

          <SectionHeading className="mb-4">Metric Display with Trend Indicators</SectionHeading>
          <div className="grid grid-cols-3 gap-4">
            {/* Trend up (green) */}
            <div className="text-center">
              <div className="flex items-center justify-center gap-1.5">
                <p className="text-3xl font-bold" style={{ color: 'var(--p-text)' }}>87%</p>
                <svg className="w-5 h-5" style={{ color: 'var(--p-green)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 15l7-7 7 7" /></svg>
              </div>
              <p className="text-sm" style={{ color: 'var(--p-text-muted)' }}>Completion Rate</p>
              <p className="text-xs mt-0.5" style={{ color: 'var(--p-green)' }}>+12% from last month</p>
            </div>
            {/* Trend down (red) */}
            <div className="text-center">
              <div className="flex items-center justify-center gap-1.5">
                <p className="text-3xl font-bold" style={{ color: 'var(--p-text)' }}>5</p>
                <svg className="w-5 h-5" style={{ color: 'var(--p-red-text)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" /></svg>
              </div>
              <p className="text-sm" style={{ color: 'var(--p-text-muted)' }}>Tests Missing</p>
              <p className="text-xs mt-0.5" style={{ color: 'var(--p-red-text)' }}>+2 since last visit</p>
            </div>
            {/* No trend (neutral) */}
            <div className="text-center">
              <div className="flex items-center justify-center gap-1.5">
                <p className="text-3xl font-bold" style={{ color: 'var(--p-text)' }}>14</p>
              </div>
              <p className="text-sm" style={{ color: 'var(--p-text-muted)' }}>Days to Appointment</p>
            </div>
          </div>
          <p className="text-xs mt-4" style={{ color: 'var(--p-text-faint)' }}>Green arrow up for positive trends. Red arrow down for negative. Never use orange for trend indicators.</p>
        </div>

        {/* Tables */}
        <div className="rounded-2xl p-6 mb-8" style={{ backgroundColor: 'var(--p-surface)', border: '1px solid var(--p-border)' }}>
          <SectionHeading className="mb-4">Table</SectionHeading>
          <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--p-border)' }}>
            <table className="w-full text-left">
              <thead>
                <tr style={{ backgroundColor: 'var(--p-surface-alt)' }}>
                  <th className="px-4 py-3 text-sm font-medium" style={{ color: 'var(--p-text-muted)', borderBottom: '1px solid var(--p-border)' }}>Test Name</th>
                  <th className="px-4 py-3 text-sm font-medium" style={{ color: 'var(--p-text-muted)', borderBottom: '1px solid var(--p-border)' }}>Status</th>
                  <th className="px-4 py-3 text-sm font-medium" style={{ color: 'var(--p-text-muted)', borderBottom: '1px solid var(--p-border)' }}>Date</th>
                  <th className="px-4 py-3 text-sm font-medium" style={{ color: 'var(--p-text-muted)', borderBottom: '1px solid var(--p-border)' }}>Result</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { test: 'BRCA1/2', status: 'Complete', statusColor: 'green', date: 'Mar 12, 2026', result: 'Negative' },
                  { test: 'HER2 (IHC)', status: 'Complete', statusColor: 'green', date: 'Mar 10, 2026', result: 'Positive (3+)' },
                  { test: 'Oncotype DX', status: 'Missing', statusColor: 'red', date: '--', result: '--' },
                  { test: 'PD-L1', status: 'Pending', statusColor: 'blue', date: 'Mar 28, 2026', result: 'Awaiting' },
                ].map((row, i) => {
                  const statusBg = row.statusColor === 'green' ? 'var(--p-badge-green-bg)' : row.statusColor === 'red' ? 'var(--p-badge-red-bg)' : 'var(--p-badge-blue-bg)';
                  const statusText = row.statusColor === 'green' ? 'var(--p-badge-green-text)' : row.statusColor === 'red' ? 'var(--p-badge-red-text)' : 'var(--p-badge-blue-text)';
                  return (
                    <tr
                      key={row.test}
                      className="transition-colors duration-[50ms]"
                      style={{ borderBottom: '1px solid var(--p-border)' }}
                      onMouseOver={e => e.currentTarget.style.backgroundColor = 'var(--p-surface-alt)'}
                      onMouseOut={e => e.currentTarget.style.backgroundColor = 'transparent'}
                    >
                      <td className="px-4 py-3 text-sm font-medium" style={{ color: 'var(--p-text)' }}>{row.test}</td>
                      <td className="px-4 py-3">
                        <span className="rounded-full px-3 py-1 text-xs font-medium" style={{ backgroundColor: statusBg, color: statusText }}>{row.status}</span>
                      </td>
                      <td className="px-4 py-3 text-sm" style={{ color: 'var(--p-text-body)' }}>{row.date}</td>
                      <td className="px-4 py-3 text-sm" style={{ color: 'var(--p-text-body)' }}>{row.result}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="text-xs mt-3" style={{ color: 'var(--p-text-faint)' }}>Header: surface-alt background, medium weight. Rows: hover state, subtle borders. Optional zebra striping with even:bg-slate-50.</p>

          {/* Zebra striping variant */}
          <SectionHeading className="mt-6 mb-3">Table with Zebra Striping</SectionHeading>
          <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--p-border)' }}>
            <table className="w-full text-left">
              <thead>
                <tr style={{ backgroundColor: 'var(--p-surface-alt)' }}>
                  <th className="px-4 py-3 text-sm font-medium" style={{ color: 'var(--p-text-muted)', borderBottom: '1px solid var(--p-border)' }}>Record</th>
                  <th className="px-4 py-3 text-sm font-medium" style={{ color: 'var(--p-text-muted)', borderBottom: '1px solid var(--p-border)' }}>Type</th>
                  <th className="px-4 py-3 text-sm font-medium" style={{ color: 'var(--p-text-muted)', borderBottom: '1px solid var(--p-border)' }}>Uploaded</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { record: 'Pathology Report', type: 'Lab', date: 'Mar 15' },
                  { record: 'MRI Scan', type: 'Imaging', date: 'Mar 12' },
                  { record: 'Blood Panel', type: 'Lab', date: 'Mar 8' },
                  { record: 'CT Scan', type: 'Imaging', date: 'Feb 28' },
                ].map((row, i) => (
                  <tr key={row.record} style={{ backgroundColor: i % 2 === 1 ? 'var(--p-surface-alt)' : 'transparent', borderBottom: '1px solid var(--p-border)' }}>
                    <td className="px-4 py-3 text-sm font-medium" style={{ color: 'var(--p-text)' }}>{row.record}</td>
                    <td className="px-4 py-3 text-sm" style={{ color: 'var(--p-text-body)' }}>{row.type}</td>
                    <td className="px-4 py-3 text-sm" style={{ color: 'var(--p-text-body)' }}>{row.date}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-xs mt-3" style={{ color: 'var(--p-text-faint)' }}>Alternate rows use surface-alt background for visual grouping in dense data.</p>
        </div>

        {/* Icons */}
        <div className="rounded-2xl p-6 mb-8" style={{ backgroundColor: 'var(--p-surface)', border: '1px solid var(--p-border)' }}>
          <SectionHeading className="mb-4">Icon Colors</SectionHeading>
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <button className="flex items-center gap-2 font-medium text-sm min-h-[44px]" style={{ color: 'var(--p-orange)' }}>
                <span>View details</span>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
              </button>
              <span className="text-sm ml-2" style={{ color: 'var(--p-text-faint)' }}>Interactive icon inside a CTA link = orange (inherits from parent)</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2" style={{ color: 'var(--p-text-muted)' }}>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                <span className="text-sm">Updated 2 hours ago</span>
              </div>
              <span className="text-sm ml-2" style={{ color: 'var(--p-text-faint)' }}>Decorative icon = muted text</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5" style={{ color: 'var(--p-green)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                <span className="text-sm" style={{ color: 'var(--p-text-body)' }}>Test complete</span>
              </div>
              <span className="text-sm ml-2" style={{ color: 'var(--p-text-faint)' }}>Status icon = status color</span>
            </div>
          </div>
        </div>

        {/* Do / Don't */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="rounded-2xl p-6" style={{ backgroundColor: 'var(--p-dont-bg)', border: '1px solid var(--p-dont-border)' }}>
            <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--p-dont-text)' }}>DON'T</h3>
            <div className="flex gap-2 mb-2">
              <span className="rounded-full px-3 py-1 text-xs font-medium" style={{ backgroundColor: 'var(--p-orange-light)', color: 'var(--p-orange)' }}>Orange Badge</span>
              <span className="rounded-full px-3 py-1 text-xs font-medium" style={{ backgroundColor: 'var(--p-orange-light)', color: 'var(--p-orange)' }}>Amber Badge</span>
            </div>
            <p className="text-xs" style={{ color: 'var(--p-red-text)' }}>Orange/amber on non-clickable elements</p>
          </div>
          <div className="rounded-2xl p-6" style={{ backgroundColor: 'var(--p-do-bg)', border: '1px solid var(--p-do-border)' }}>
            <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--p-do-text)' }}>DO</h3>
            <div className="flex gap-2 mb-2">
              <span className="rounded-full px-3 py-1 text-xs font-medium" style={{ backgroundColor: 'var(--p-badge-blue-bg)', color: 'var(--p-badge-blue-text)' }}>Info Badge</span>
              <span className="rounded-full px-3 py-1 text-xs font-medium" style={{ backgroundColor: 'var(--p-badge-default-bg)', color: 'var(--p-badge-default-text)' }}>Default Badge</span>
            </div>
            <p className="text-xs" style={{ color: 'var(--p-green-text)' }}>Neutral colors for informational elements</p>
          </div>
        </div>
      </div>
    </div>
  );
}
