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
      {/* Intro Header */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-6 sm:p-7 shadow-xs space-y-2">
        <div className="flex items-center space-x-2.5">
          <span className="p-2 rounded-xl bg-blue-50 text-blue-600 border border-blue-200">
            <BookOpen className="w-5 h-5" />
          </span>
          <h2 className="text-lg sm:text-xl font-bold text-slate-900">
            Course Bazar: Step-by-Step Beginner Setup Guide
          </h2>
        </div>
        <p className="text-xs sm:text-sm text-slate-500 leading-relaxed max-w-3xl">
          Everything you need to launch and operate your course selling Telegram bot using Google Sheets.
          Follow these steps in order — no coding or programming experience needed.
        </p>
      </div>

      {/* STEP 1: BotFather */}
      <section className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-xs space-y-3.5">
        <div className="flex items-center space-x-3">
          <span className="w-8 h-8 rounded-xl bg-blue-50 text-blue-700 font-bold flex items-center justify-center text-xs border border-blue-200">
            1
          </span>
          <div>
            <h3 className="text-sm font-bold text-slate-900">Create Telegram Bot with @BotFather</h3>
            <p className="text-xs text-slate-400">Get your unique Telegram BOT_TOKEN</p>
          </div>
        </div>

        <div className="space-y-2.5 text-xs text-slate-600 leading-relaxed">
          <p>1. Open Telegram on your smartphone or PC and search for <strong className="text-blue-600 font-semibold">@BotFather</strong>.</p>
          <p>2. Send the command:</p>
          <div className="flex items-center justify-between bg-slate-50 p-2.5 rounded-xl border border-slate-200 font-mono text-blue-700 font-semibold">
            <span>/newbot</span>
            <button
              onClick={() => copyToClipboard('/newbot', 'cmd_newbot')}
              className="p-1 hover:text-slate-900 text-slate-500 transition"
              title="Copy"
            >
              {copiedKey === 'cmd_newbot' ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>
          <p>3. Enter your store name (e.g., <code>Course Bazar</code>).</p>
          <p>4. Enter a username ending in <code>bot</code> (e.g., <code>my_course_bazar_bot</code>).</p>
          <p>5. Copy the <strong>HTTP API Token</strong> provided by BotFather (looks like <code>1234567890:ABCdefGh...</code>).</p>
          <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-center space-x-2">
            <Key className="w-4 h-4 text-amber-600 flex-shrink-0" />
            <span>Paste this token inside your <code>.env</code> file under <code>BOT_TOKEN=...</code></span>
          </div>
        </div>
      </section>

      {/* STEP 2: Numeric User ID */}
      <section className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-xs space-y-3.5">
        <div className="flex items-center space-x-3">
          <span className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-700 font-bold flex items-center justify-center text-xs border border-indigo-200">
            2
          </span>
          <div>
            <h3 className="text-sm font-bold text-slate-900">Get Your Numeric Telegram User ID</h3>
            <p className="text-xs text-slate-400">So the bot recognizes your personal account as Owner/Admin</p>
          </div>
        </div>

        <div className="space-y-2.5 text-xs text-slate-600 leading-relaxed">
          <p>1. In Telegram, search for <strong className="text-indigo-600 font-semibold">@userinfobot</strong>.</p>
          <p>2. Click <strong>Start</strong>. It will immediately reply with your numeric account ID.</p>
          <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 font-mono text-slate-700 space-y-0.5">
            <div>Id: 987654321</div>
            <div>First: Your Name</div>
          </div>
          <p>3. Copy the number and set it as <code>ADMIN_TELEGRAM_ID=...</code> in <code>.env</code>.</p>
        </div>
      </section>

      {/* STEP 3: Google Sheets Setup */}
      <section className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-xs space-y-3.5">
        <div className="flex items-center space-x-3">
          <span className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-700 font-bold flex items-center justify-center text-xs border border-emerald-200">
            3
          </span>
          <div>
            <h3 className="text-sm font-bold text-slate-900">Google Cloud Service Account (Free & Secure)</h3>
            <p className="text-xs text-slate-400">Allows the bot to read and update your spreadsheet</p>
          </div>
        </div>

        <div className="space-y-2.5 text-xs text-slate-600 leading-relaxed">
          <p>
            1. Open <a href="https://console.cloud.google.com/" target="_blank" rel="noreferrer" className="text-blue-600 underline font-semibold">Google Cloud Console</a> and create a project named <code>Course Bazar</code>.
          </p>
          <p>2. Search for <strong>Google Sheets API</strong> and click <strong>Enable</strong>.</p>
          <p>3. Go to <strong>IAM & Admin</strong> → <strong>Service Accounts</strong> → <strong>+ Create Service Account</strong>.</p>
          <p>4. Name it <code>course-bazar-sheets</code> and click <strong>Done</strong>.</p>
          <p>5. Click on the email created → <strong>Keys</strong> tab → <strong>Add Key</strong> → <strong>Create new key (JSON)</strong>.</p>
          <p>6. Open the downloaded JSON key file in Notepad:</p>
          <ul className="list-disc list-inside space-y-1 pl-2 text-slate-600">
            <li>Copy <code>client_email</code> → paste into <code>GOOGLE_SERVICE_ACCOUNT_EMAIL</code> in <code>.env</code>.</li>
            <li>Copy <code>private_key</code> → paste into <code>GOOGLE_PRIVATE_KEY</code> in <code>.env</code>.</li>
          </ul>
          <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 font-medium">
            ⚠️ <strong>CRITICAL STEP:</strong> Open your Google Sheet in your browser → Click the blue <strong>Share</strong> button at the top right → Paste your service account email → Set permission to <strong>Editor</strong> → Click Share!
          </div>
        </div>
      </section>

      {/* STEP 4: Google Sheets Headers */}
      <section className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-xs space-y-3.5">
        <div className="flex items-center space-x-3">
          <span className="w-8 h-8 rounded-xl bg-blue-50 text-blue-700 font-bold flex items-center justify-center text-xs border border-blue-200">
            4
          </span>
          <div>
            <h3 className="text-sm font-bold text-slate-900">Copy-Paste Ready Sheet Headers</h3>
            <p className="text-xs text-slate-400">Create these 4 tabs at the bottom of your Google Sheet</p>
          </div>
        </div>

        <div className="space-y-3 text-xs">
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="font-semibold text-slate-700">Tab 1: "Courses" (Row 1 Headers)</span>
              <button
                onClick={() => copyToClipboard('Course ID\tCourse Name\tCreator Name\tPrice\tOriginal Price\tCourse Size\tLanguage\tDrive Link\tZIP Password\tDescription\tThumbnail URL\tStatus\tCreated At', 'tab_courses')}
                className="text-xs text-blue-600 hover:underline flex items-center space-x-1"
              >
                <span>{copiedKey === 'tab_courses' ? 'Copied!' : 'Copy Row 1'}</span>
              </button>
            </div>
            <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 font-mono text-[11px] text-slate-700 overflow-x-auto whitespace-nowrap">
              Course ID | Course Name | Creator Name | Price | Original Price | Course Size | Language | Drive Link | ZIP Password | Description | Thumbnail URL | Status | Created At
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="font-semibold text-slate-700">Tab 2: "Purchases" (Row 1 Headers)</span>
              <button
                onClick={() => copyToClipboard('Telegram User ID\tTelegram Username\tCustomer Name\tCourse ID\tCourse Name\tAmount\tPayment Screenshot File ID\tStatus\tCreated At\tApproved At\tApproved By', 'tab_purchases')}
                className="text-xs text-blue-600 hover:underline flex items-center space-x-1"
              >
                <span>{copiedKey === 'tab_purchases' ? 'Copied!' : 'Copy Row 1'}</span>
              </button>
            </div>
            <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 font-mono text-[11px] text-slate-700 overflow-x-auto whitespace-nowrap">
              Telegram User ID | Telegram Username | Customer Name | Course ID | Course Name | Amount | Payment Screenshot File ID | Status | Created At | Approved At | Approved By
            </div>
          </div>
        </div>
      </section>

      {/* STEP 5: Windows Terminal Commands */}
      <section className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-xs space-y-3.5">
        <div className="flex items-center space-x-3">
          <span className="w-8 h-8 rounded-xl bg-purple-50 text-purple-700 font-bold flex items-center justify-center text-xs border border-purple-200">
            5
          </span>
          <div>
            <h3 className="text-sm font-bold text-slate-900">Run Locally on Windows (PowerShell / Command Prompt)</h3>
            <p className="text-xs text-slate-400">Launch the bot directly on your laptop/PC</p>
          </div>
        </div>

        <div className="bg-slate-900 text-slate-100 p-4 rounded-xl font-mono text-xs space-y-2 overflow-x-auto">
          <div className="text-slate-500"># 1. Install dependencies</div>
          <div className="text-emerald-400">npm install</div>

          <div className="text-slate-500 mt-2"># 2. Make a copy of environment file</div>
          <div className="text-emerald-400">copy .env.example .env</div>

          <div className="text-slate-500 mt-2"># 3. Start standalone Telegram bot</div>
          <div className="text-emerald-400">npm run bot</div>

          <div className="text-slate-500 mt-2"># OR launch full system with this web dashboard</div>
          <div className="text-emerald-400">npm run dev</div>
        </div>
      </section>
    </div>
  );
};
