'use client'

import { Button } from '@/components/ui/button'
import { useState } from 'react'

const ENV_TEMPLATE = `# ── Supabase ──────────────────────────────────────────────
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT_ID.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here

# ── AI (Groq) ──────────────────────────────────────────────
# Free tier available at https://console.groq.com
GROQ_API_KEY=your_groq_api_key_here

# ── App URL ────────────────────────────────────────────────
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXTAUTH_URL=http://localhost:3000`

const STEPS = [
  {
    number: '01',
    title: 'Download and extract the project',
    icon: '📦',
    content: [
      'Click the "Download ZIP" button above to download the full project source code.',
      'Once downloaded, right-click the ZIP file and choose "Extract All" (Windows) or double-click it (Mac).',
      'The extracted folder contains everything: source code, database migrations, and configuration files.',
    ],
    note: 'No API keys or secrets are included in the ZIP — you will fill those in yourself in a later step.',
  },
  {
    number: '02',
    title: 'Install Node.js',
    icon: '🟢',
    content: [
      'Make sure Node.js 18 or newer is installed on your machine.',
      'Download it from https://nodejs.org — choose the LTS (Long Term Support) version.',
      'After installing, open a terminal and run: node --version  to confirm it works.',
    ],
    note: 'npm (Node Package Manager) is included with Node.js — no separate install needed.',
  },
  {
    number: '03',
    title: 'Create a Supabase project',
    icon: '🗄️',
    content: [
      'Go to https://supabase.com and sign up for a free account.',
      'Click "New project" and fill in the project name, database password, and region.',
      'Wait for the project to finish provisioning (usually 1–2 minutes).',
    ],
    note: 'Keep the database password somewhere safe — you may need it for direct database access.',
  },
  {
    number: '04',
    title: 'Run the database migrations',
    icon: '⚙️',
    content: [
      'Inside the extracted project folder, open the supabase/migrations/ directory.',
      'You will find numbered SQL files (001_initial_schema.sql, 002_rls_policies.sql, etc.).',
      'In your Supabase dashboard, open the SQL Editor from the left sidebar.',
      'Click "New query", paste the full contents of each file in order (001 first, then 002, and so on), then click Run after each.',
      'Tip: you can also paste all the files combined into a single query and run them all at once.',
    ],
    note: 'All tables, policies, functions, and seed data will be created. Run each file only once.',
  },
  {
    number: '05',
    title: 'Get your Supabase credentials',
    icon: '🔑',
    content: [
      'In your Supabase dashboard, go to Project Settings → API.',
      'Copy the Project URL → you will use this as NEXT_PUBLIC_SUPABASE_URL.',
      'Copy the anon / public key → use this as NEXT_PUBLIC_SUPABASE_ANON_KEY.',
      'Copy the service_role / secret key → use this as SUPABASE_SERVICE_ROLE_KEY.',
    ],
    note: 'Never expose the service_role key publicly. It must only ever be in your private .env.local file.',
  },
  {
    number: '06',
    title: 'Get a Groq API key (for AI features)',
    icon: '🤖',
    content: [
      'Go to https://console.groq.com and sign up — a free tier is available.',
      'In the dashboard, click "Create API Key" and copy the generated key.',
      'You will paste this as GROQ_API_KEY in the next step.',
    ],
    note: 'Without this key, AI Insights and AI Survey generation will not work.',
  },
  {
    number: '07',
    title: 'Configure Supabase Auth settings',
    icon: '🔒',
    content: [
      'In your Supabase dashboard, go to Authentication → URL Configuration.',
      'Set the Site URL to: http://localhost:3000',
      'Add http://localhost:3000/** to the Redirect URLs list.',
      'Under Authentication → Providers, make sure Email is enabled.',
    ],
    note: 'This is required for login and email confirmation flows to work correctly.',
  },
  {
    number: '08',
    title: 'Create your .env.local file',
    icon: '📄',
    content: [
      'In the root of the extracted project folder, create a new file named exactly: .env.local',
      'Copy the template below into the file, then replace each placeholder with your real values from the previous steps.',
      'Save the file. It is already listed in .gitignore so it will never be accidentally committed.',
    ],
    note: 'Never share this file or upload it anywhere — it contains your secret credentials.',
    code: ENV_TEMPLATE,
  },
  {
    number: '09',
    title: 'Install dependencies and start the app',
    icon: '🚀',
    content: [
      'Open a terminal (Command Prompt, PowerShell, or Terminal) inside the extracted project folder.',
      'Run: npm install   — this downloads all required packages (takes about 1 minute).',
      'Then run: npm run dev',
      'Open your browser and go to: http://localhost:3000',
    ],
    note: 'For production deployment, run npm run build then npm start, or push to Vercel for automatic deployment.',
  },
  {
    number: '10',
    title: 'Create the first admin account',
    icon: '👤',
    content: [
      'Go to http://localhost:3000/login and click "Sign up".',
      'Register with your email, a strong password, and select the Admin role.',
      'Because no admin exists yet to approve you, you must manually approve yourself in Supabase.',
      'In Supabase → Authentication → Users: confirm your email if it shows as unconfirmed.',
      'In Supabase → Table Editor → profiles: find your row, set status to "approved" and role to "admin".',
      'Log in again — you now have full admin access to the platform.',
    ],
    note: 'After the first admin is set up, all future analyst accounts can be approved from the Notifications tab in Settings.',
  },
]

export default function DownloadPanel() {
  const [downloadingProject, setDownloadingProject] = useState(false)
  const [copiedEnv, setCopiedEnv] = useState(false)

  const handleDownloadProject = async () => {
    setDownloadingProject(true)
    try {
      const res = await fetch('/api/admin/download/project')
      if (!res.ok) throw new Error('Download failed')
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'dip-app.zip'
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      alert('Failed to download project. Please try again.')
    } finally {
      setDownloadingProject(false)
    }
  }

  const handleCopyEnv = () => {
    navigator.clipboard.writeText(ENV_TEMPLATE).then(() => {
      setCopiedEnv(true)
      setTimeout(() => setCopiedEnv(false), 2000)
    })
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h2 className="text-xl font-semibold text-gray-900">Download & Setup Guide</h2>
        <p className="text-sm text-gray-500 mt-1">
          Download the complete project and follow the steps below to run this platform on your own machine.
        </p>
      </div>

      {/* Download card */}
      <div className="bg-gray-50 border border-gray-200 rounded-xl p-5 flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="flex-1">
          <h3 className="text-sm font-semibold text-gray-900">Full Project Source Code</h3>
          <p className="text-xs text-gray-500 mt-1">
            Complete source code including database migrations as a ZIP file. Excludes{' '}
            <code className="bg-gray-200 px-1 rounded text-gray-700">.env.local</code>,{' '}
            <code className="bg-gray-200 px-1 rounded text-gray-700">node_modules</code>,{' '}
            <code className="bg-gray-200 px-1 rounded text-gray-700">.next</code>, and{' '}
            <code className="bg-gray-200 px-1 rounded text-gray-700">.git</code>. No secrets included.
          </p>
        </div>
        <Button
          onClick={handleDownloadProject}
          disabled={downloadingProject}
          variant="secondary"
          size="lg"
          className="shrink-0 bg-[#00B3B0] hover:bg-[#009E9B] text-white rounded-xl"
        >
          <span>{downloadingProject ? '⏳' : '↓'}</span>
          {downloadingProject ? 'Zipping… please wait' : 'Download ZIP'}
        </Button>
      </div>

      {/* Step-by-step guide */}
      <div>
        <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider mb-4">
          Step-by-Step Setup
        </h3>
        <div className="space-y-4">
          {STEPS.map(step => (
            <div key={step.number} className="border border-gray-200 rounded-xl overflow-hidden">
              {/* Step header */}
              <div className="flex items-center gap-3 px-5 py-4 bg-white">
                <span className="shrink-0 w-8 h-8 rounded-full bg-[#00B3B0] text-white text-xs font-bold flex items-center justify-center">
                  {step.number}
                </span>
                <span className="text-base">{step.icon}</span>
                <h4 className="font-semibold text-gray-900 text-sm">{step.title}</h4>
              </div>

              {/* Step body */}
              <div className="px-5 pb-5 bg-white border-t border-gray-100">
                <ul className="mt-3 space-y-2">
                  {step.content.map((line, i) => (
                    <li key={i} className="flex gap-2 text-sm text-gray-700">
                      <span className="shrink-0 text-gray-400 mt-0.5">•</span>
                      <span>{line}</span>
                    </li>
                  ))}
                </ul>

                {step.note && (
                  <div className="mt-3 flex gap-2 text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
                    <span className="shrink-0">⚠</span>
                    <span>{step.note}</span>
                  </div>
                )}

                {step.code && (
                  <div className="mt-4">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs font-medium text-gray-500">.env.local template</span>
                      <Button
                        onClick={handleCopyEnv}
                        variant="outline"
                        size="xs"
                        className="rounded-lg"
                      >
                        {copiedEnv ? '✓ Copied' : 'Copy'}
                      </Button>
                    </div>
                    <pre className="bg-gray-950 text-green-400 text-xs rounded-lg p-4 overflow-x-auto leading-relaxed whitespace-pre">
                      {step.code}
                    </pre>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Footer note */}
      <div className="border border-blue-100 bg-blue-50 rounded-xl px-5 py-4 text-sm text-blue-800">
        <p className="font-semibold mb-1">Need help?</p>
        <p className="text-xs text-blue-700">
          Supabase docs: <span className="font-mono">https://supabase.com/docs</span> ·
          Next.js docs: <span className="font-mono">https://nextjs.org/docs</span> ·
          Groq docs: <span className="font-mono">https://console.groq.com/docs</span>
        </p>
      </div>
    </div>
  )
}

