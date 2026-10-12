import React, { useState } from 'react';
import { Copy, Check, Terminal, ExternalLink, HelpCircle, Shield, AlertTriangle, Key, Layers, ChevronRight, BookOpen, Download, Server, Sparkles } from 'lucide-react';

export const BeginnerGuide: React.FC = () => {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Intro Header Card */}
      <div className="clay-card p-6 sm:p-8 space-y-2">
        <div className="flex items-center space-x-3">
          <div 
            className="w-11 h-11 rounded-2xl flex items-center justify-center text-white"
            style={{
              background: 'linear-gradient(180deg, #6054F7 0%, #4D3FE8 100%)',
              boxShadow: '0 6px 16px -2px rgba(77, 63, 232, 0.35), inset 0 1px 1px rgba(255, 255, 255, 0.4)'
            }}
          >
            <BookOpen className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg sm:text-xl font-extrabold text-slate-900 tracking-tight">
              Course Bazar: Step-by-Step Beginner Setup Guide
            </h2>
            <p className="text-xs text-slate-400 font-medium">
              Complete setup guide for BotFather, Google Sheets, and payment verification
            </p>
          </div>
        </div>
        <p className="text-xs sm:text-sm text-slate-500 leading-relaxed max-w-3xl pt-2 font-medium">
          Everything you need to launch and operate your course selling Telegram bot using Google Sheets.
          Follow these steps in order — no coding or programming experience needed.
        </p>
      </div>

      {/* STEP 1: BotFather */}
      <section className="clay-card p-6 sm:p-7 space-y-4">
        <div className="flex items-center space-x-3.5">
          <div 
            className="w-9 h-9 rounded-2xl font-bold flex items-center justify-center text-xs text-indigo-700 bg-indigo-50 border border-indigo-200/80"
            style={{
              boxShadow: 'inset 0 1px 2px rgba(255, 255, 255, 1), 0 2px 6px -1px rgba(77, 63, 232, 0.1)'
            }}
          >
            1
          </div>
          <div>
            <h3 className="text-sm font-extrabold text-slate-900 tracking-tight">Create Telegram Bot with @BotFather</h3>
            <p className="text-xs text-slate-400 font-medium">Get your unique Telegram BOT_TOKEN</p>
          </div>
        </div>

        <div className="space-y-3 text-xs text-slate-600 leading-relaxed font-medium">
          <p>1. Open Telegram on your smartphone or PC and search for <strong className="text-indigo-600 font-bold">@BotFather</strong>.</p>
          <p>2. Send the command:</p>
          <div className="flex items-center justify-between clay-inset p-3 font-mono text-indigo-700 font-bold text-xs">
            <span>/newbot</span>
            <button
              onClick={() => copyToClipboard('/newbot', 'cmd_newbot')}
              className="clay-btn-secondary p-1.5 text-slate-500 hover:text-slate-900"
              title="Copy"
            >
              {copiedKey === 'cmd_newbot' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          </div>
          <p>3. Enter your store name (e.g., <code>Course Bazar</code>).</p>
          <p>4. Enter a username ending in <code>bot</code> (e.g., <code>my_course_bazar_bot</code>).</p>
          <p>5. Copy the <strong>HTTP API Token</strong> provided by BotFather (looks like <code>1234567890:ABCdefGh...</code>).</p>
          
          <div className="p-3.5 rounded-2xl bg-amber-50/80 border border-amber-200/90 text-amber-900 text-xs flex items-center space-x-2.5 shadow-2xs">
            <Key className="w-4 h-4 text-amber-600 shrink-0" />
            <span className="font-medium">Paste this token inside your <code>.env</code> file under <code>BOT_TOKEN=...</code></span>
          </div>
        </div>
      </section>

      {/* STEP 2: Numeric User ID */}
      <section className="clay-card p-6 sm:p-7 space-y-4">
        <div className="flex items-center space-x-3.5">
          <div 
            className="w-9 h-9 rounded-2xl font-bold flex items-center justify-center text-xs text-indigo-700 bg-indigo-50 border border-indigo-200/80"
            style={{
              boxShadow: 'inset 0 1px 2px rgba(255, 255, 255, 1), 0 2px 6px -1px rgba(77, 63, 232, 0.1)'
            }}
          >
            2
          </div>
          <div>
            <h3 className="text-sm font-extrabold text-slate-900 tracking-tight">Get Your Numeric Telegram User ID</h3>
            <p className="text-xs text-slate-400 font-medium">So the bot recognizes your personal account as Owner/Admin</p>
          </div>
        </div>

        <div className="space-y-3 text-xs text-slate-600 leading-relaxed font-medium">
          <p>1. In Telegram, search for <strong className="text-indigo-600 font-bold">@userinfobot</strong>.</p>
          <p>2. Click <strong>Start</strong>. It will immediately reply with your numeric account ID.</p>
          <div className="clay-inset p-3.5 font-mono text-slate-700 space-y-1 text-xs">
            <div className="font-bold text-slate-900">Id: 987654321</div>
            <div className="text-slate-500">First: Your Name</div>
          </div>
          <p>3. Copy the number and set it as <code>ADMIN_TELEGRAM_ID=...</code> in <code>.env</code>.</p>
        </div>
      </section>

      {/* STEP 3: Google Sheets Setup */}
      <section className="clay-card p-6 sm:p-7 space-y-4">
        <div className="flex items-center space-x-3.5">
          <div 
            className="w-9 h-9 rounded-2xl font-bold flex items-center justify-center text-xs text-indigo-700 bg-indigo-50 border border-indigo-200/80"
            style={{
              boxShadow: 'inset 0 1px 2px rgba(255, 255, 255, 1), 0 2px 6px -1px rgba(77, 63, 232, 0.1)'
            }}
          >
            3
          </div>
          <div>
            <h3 className="text-sm font-extrabold text-slate-900 tracking-tight">Google Cloud Service Account (Free & Secure)</h3>
            <p className="text-xs text-slate-400 font-medium">Allows the bot to read and update your spreadsheet</p>
          </div>
        </div>

        <div className="space-y-3 text-xs text-slate-600 leading-relaxed font-medium">
          <p>
            1. Open <a href="https://console.cloud.google.com/" target="_blank" rel="noreferrer" className="text-indigo-600 underline font-bold">Google Cloud Console</a> and create a project named <code>Course Bazar</code>.
          </p>
          <p>2. Search for <strong>Google Sheets API</strong> and click <strong>Enable</strong>.</p>
          <p>3. Go to <strong>IAM & Admin</strong> → <strong>Service Accounts</strong> → <strong>+ Create Service Account</strong>.</p>
          <p>4. Name it <code>course-bazar-sheets</code> and click <strong>Done</strong>.</p>
          <p>5. Click on the email created → <strong>Keys</strong> tab → <strong>Add Key</strong> → <strong>Create new key (JSON)</strong>.</p>
          <p>6. Open the downloaded JSON key file in Notepad:</p>
          <ul className="list-disc list-inside space-y-1.5 pl-2 text-slate-500">
            <li>Copy <code>client_email</code> → paste into <code>GOOGLE_SERVICE_ACCOUNT_EMAIL</code> in <code>.env</code>.</li>
            <li>Copy <code>private_key</code> → paste into <code>GOOGLE_PRIVATE_KEY</code> in <code>.env</code>.</li>
          </ul>
          <div className="p-4 rounded-2xl bg-emerald-50/90 border border-emerald-200/90 text-emerald-900 font-medium shadow-2xs">
            ⚠️ <strong className="font-bold">CRITICAL STEP:</strong> Open your Google Sheet in your browser → Click the blue <strong>Share</strong> button at the top right → Paste your service account email → Set permission to <strong>Editor</strong> → Click Share!
          </div>
        </div>
      </section>

      {/* STEP 4: Google Sheets Headers */}
      <section className="clay-card p-6 sm:p-7 space-y-4">
        <div className="flex items-center space-x-3.5">
          <div 
            className="w-9 h-9 rounded-2xl font-bold flex items-center justify-center text-xs text-indigo-700 bg-indigo-50 border border-indigo-200/80"
            style={{
              boxShadow: 'inset 0 1px 2px rgba(255, 255, 255, 1), 0 2px 6px -1px rgba(77, 63, 232, 0.1)'
            }}
          >
            4
          </div>
          <div>
            <h3 className="text-sm font-extrabold text-slate-900 tracking-tight">Copy-Paste Ready Sheet Headers</h3>
            <p className="text-xs text-slate-400 font-medium">Create these 4 tabs at the bottom of your Google Sheet</p>
          </div>
        </div>

        <div className="space-y-4 text-xs font-medium">
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="font-bold text-slate-800">Tab 1: "Courses" (Row 1 Headers)</span>
              <button
                onClick={() => copyToClipboard('Course ID\tCourse Name\tCreator Name\tPrice\tOriginal Price\tCourse Size\tLanguage\tDrive Link\tZIP Password\tDescription\tThumbnail URL\tStatus\tCreated At', 'tab_courses')}
                className="clay-btn-secondary px-2.5 py-1 text-[11px] font-bold"
              >
                <span>{copiedKey === 'tab_courses' ? 'Copied!' : 'Copy Row 1'}</span>
              </button>
            </div>
            <div className="clay-inset p-3 font-mono text-[11px] text-slate-700 overflow-x-auto whitespace-nowrap">
              Course ID | Course Name | Creator Name | Price | Original Price | Course Size | Language | Drive Link | ZIP Password | Description | Thumbnail URL | Status | Created At
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="font-bold text-slate-800">Tab 2: "Purchases" (Row 1 Headers)</span>
              <button
                onClick={() => copyToClipboard('Telegram User ID\tTelegram Username\tCustomer Name\tCourse ID\tCourse Name\tAmount\tPayment Screenshot File ID\tStatus\tCreated At\tApproved At\tApproved By', 'tab_purchases')}
                className="clay-btn-secondary px-2.5 py-1 text-[11px] font-bold"
              >
                <span>{copiedKey === 'tab_purchases' ? 'Copied!' : 'Copy Row 1'}</span>
              </button>
            </div>
            <div className="clay-inset p-3 font-mono text-[11px] text-slate-700 overflow-x-auto whitespace-nowrap">
              Telegram User ID | Telegram Username | Customer Name | Course ID | Course Name | Amount | Payment Screenshot File ID | Status | Created At | Approved At | Approved By
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="font-bold text-slate-800">Tab 3: "Admins" (Row 1 Headers)</span>
              <button
                onClick={() => copyToClipboard('Admin ID\tAdmin Name\tTelegram User ID\tTelegram Username\tRole\tStatus\tAdded By\tCreated At', 'tab_admins')}
                className="clay-btn-secondary px-2.5 py-1 text-[11px] font-bold"
              >
                <span>{copiedKey === 'tab_admins' ? 'Copied!' : 'Copy Row 1'}</span>
              </button>
            </div>
            <div className="clay-inset p-3 font-mono text-[11px] text-slate-700 overflow-x-auto whitespace-nowrap">
              Admin ID | Admin Name | Telegram User ID | Telegram Username | Role | Status | Added By | Created At
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="font-bold text-slate-800">Tab 4: "Settings" (Row 1 Headers)</span>
              <button
                onClick={() => copyToClipboard('Setting Key\tSetting Value\tDescription\tUpdated At', 'tab_settings')}
                className="clay-btn-secondary px-2.5 py-1 text-[11px] font-bold"
              >
                <span>{copiedKey === 'tab_settings' ? 'Copied!' : 'Copy Row 1'}</span>
              </button>
            </div>
            <div className="clay-inset p-3 font-mono text-[11px] text-slate-700 overflow-x-auto whitespace-nowrap">
              Setting Key | Setting Value | Description | Updated At
            </div>
          </div>
        </div>
      </section>

      {/* STEP 5: Terminal Commands */}
      <section className="clay-card p-6 sm:p-7 space-y-4">
        <div className="flex items-center space-x-3.5">
          <div 
            className="w-9 h-9 rounded-2xl font-bold flex items-center justify-center text-xs text-indigo-700 bg-indigo-50 border border-indigo-200/80"
            style={{
              boxShadow: 'inset 0 1px 2px rgba(255, 255, 255, 1), 0 2px 6px -1px rgba(77, 63, 232, 0.1)'
            }}
          >
            5
          </div>
          <div>
            <h3 className="text-sm font-extrabold text-slate-900 tracking-tight">Run Locally (Terminal / Command Prompt)</h3>
            <p className="text-xs text-slate-400 font-medium">Launch the bot directly on your laptop/PC</p>
          </div>
        </div>

        <div className="clay-inset text-slate-800 p-4 sm:p-5 font-mono text-xs space-y-2.5 overflow-x-auto">
          <div className="text-slate-400 font-medium"># 1. Install dependencies</div>
          <div className="text-indigo-700 font-bold">npm install</div>

          <div className="text-slate-400 font-medium pt-1"># 2. Make a copy of environment file</div>
          <div className="text-indigo-700 font-bold">cp .env.example .env</div>

          <div className="text-slate-400 font-medium pt-1"># 3. Start standalone Telegram bot</div>
          <div className="text-indigo-700 font-bold">npm run bot</div>

          <div className="text-slate-400 font-medium pt-1"># OR launch full system with this web dashboard</div>
          <div className="text-emerald-700 font-bold">npm run dev</div>
        </div>
      </section>
    </div>
  );
};

