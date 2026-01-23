import React, { useState } from 'react';
import { ArrowLeft, ExternalLink, Key, Shield, BookOpen, Mail, Copy, Check } from 'lucide-react';

interface SetupGuideProps {
  onBack: () => void;
  isDark: boolean;
}

export const SetupGuide: React.FC<SetupGuideProps> = ({ onBack, isDark }) => {
  const [copied, setCopied] = useState<string | null>(null);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  const themeClasses = isDark
    ? { bg: 'bg-slate-950', card: 'bg-slate-900 border-slate-800', text: 'text-white', sub: 'text-slate-400', code: 'bg-slate-950 text-indigo-400' }
    : { bg: 'bg-slate-50', card: 'bg-white border-slate-200', text: 'text-slate-900', sub: 'text-slate-600', code: 'bg-slate-100 text-indigo-700' };

  return (
    <div className={`flex flex-col h-full overflow-y-auto ${themeClasses.bg} ${themeClasses.text} p-6 pb-24`}>
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <button onClick={onBack} className={`p-2 rounded-full ${isDark ? 'hover:bg-slate-800' : 'hover:bg-slate-200'}`}>
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-xl font-black uppercase tracking-tight">Kabalikat Setup Guide</h1>
          <p className={`text-xs ${themeClasses.sub}`}>Complete instructions for API integrations</p>
        </div>
      </div>

      <div className="space-y-12 max-w-2xl mx-auto w-full">
        
        {/* 1. AI Setup */}
        <section>
          <div className="flex items-center gap-2 mb-4">
             <div className="p-2 bg-indigo-500/10 rounded-lg text-indigo-500">
                <Key className="w-5 h-5" />
             </div>
             <h2 className="text-lg font-bold">1. AI Brain Setup</h2>
          </div>
          
          <div className={`${themeClasses.card} border rounded-2xl p-6 space-y-4`}>
             <p className={`text-sm ${themeClasses.sub} leading-relaxed`}>
               Kabalikat uses 3rd party AI models to think. You need at least one API key.
             </p>
             
             <div className="grid gap-4 sm:grid-cols-2">
                <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer" 
                   className={`p-4 rounded-xl border ${isDark ? 'border-slate-700 hover:bg-slate-800' : 'border-slate-200 hover:bg-slate-50'} transition-all group`}>
                   <div className="flex justify-between items-center mb-2">
                      <span className="font-bold text-sm">Google Gemini</span>
                      <ExternalLink className="w-4 h-4 opacity-50" />
                   </div>
                   <p className="text-[10px] opacity-60">Best for free tier usage & large context windows. Recommended.</p>
                </a>

                <a href="https://platform.openai.com/api-keys" target="_blank" rel="noreferrer" 
                   className={`p-4 rounded-xl border ${isDark ? 'border-slate-700 hover:bg-slate-800' : 'border-slate-200 hover:bg-slate-50'} transition-all group`}>
                   <div className="flex justify-between items-center mb-2">
                      <span className="font-bold text-sm">OpenAI (GPT-4)</span>
                      <ExternalLink className="w-4 h-4 opacity-50" />
                   </div>
                   <p className="text-[10px] opacity-60">High intelligence, paid usage. Good for reasoning.</p>
                </a>
             </div>
          </div>
        </section>


        {/* 2. Email Setup */}
        <section>
          <div className="flex items-center gap-2 mb-4">
             <div className="p-2 bg-orange-500/10 rounded-lg text-orange-500">
                <Mail className="w-5 h-5" />
             </div>
             <h2 className="text-lg font-bold">2. Email (App Passwords)</h2>
          </div>
          
          <div className={`${themeClasses.card} border rounded-2xl p-6 space-y-4`}>
             <div className={`text-sm ${themeClasses.sub} space-y-3 leading-relaxed`}>
               <p><strong className={themeClasses.text}>Goal:</strong> Allow Kabalikat to check Gmail for school/work deadlines.</p>
               <p><strong className={themeClasses.text}>Crucial:</strong> Your normal Gmail password will <u className="text-red-500">NOT</u> work.</p>
               
               <ol className="list-decimal pl-5 space-y-2 mt-2">
                 <li>Go to your <a href="https://myaccount.google.com/security" target="_blank" className="text-blue-500 hover:underline">Google Account Security</a> page.</li>
                 <li>Enable <strong>2-Step Verification</strong> if not already on.</li>
                 <li>Search for <strong>"App Passwords"</strong> in the search bar.</li>
                 <li>Create a new app password named "Kabalikat".</li>
                 <li>Copy the 16-character code (e.g., `abcd efgh ijkl mnop`).</li>
                 <li>Paste this into the Kabalikat <strong>Settings &gt; Email Integration</strong>.</li>
               </ol>
             </div>
          </div>
        </section>


        {/* 3. Google Classroom */}
        <section>
          <div className="flex items-center gap-2 mb-4">
             <div className="p-2 bg-green-500/10 rounded-lg text-green-500">
                <BookOpen className="w-5 h-5" />
             </div>
             <h2 className="text-lg font-bold">3. Classroom Vault (OAuth)</h2>
          </div>
          
          <div className={`${themeClasses.card} border rounded-2xl p-6 space-y-4`}>
             <div className={`p-3 ${isDark ? 'bg-yellow-900/20 text-yellow-200' : 'bg-yellow-50 text-yellow-700'} rounded-lg text-xs font-bold leading-normal mb-4`}>
                <Shield className="w-4 h-4 inline mr-2 mb-0.5" />
                Advanced Step: Required to read To-Do lists.
             </div>

             <div className={`text-sm ${themeClasses.sub} space-y-4`}>
               <p>Google Classroom requires strict OAuth2 permissions. You cannot use a simple API Key.</p>
               
               <div className="space-y-2">
                 <h3 className={`font-bold text-xs uppercase opacity-70 ${themeClasses.text}`}>Step A: Google Cloud Console</h3>
                 <ol className="list-decimal pl-5 space-y-1 text-xs">
                   <li>Create a project at <a href="https://console.cloud.google.com" className="text-blue-500 hover:underline">console.cloud.google.com</a>.</li>
                   <li>Enable <strong>"Google Classroom API"</strong> in via Library.</li>
                   <li>Go to <strong>APIs & Services &gt; OAuth Consent Screen</strong>.</li>
                   <li>Select "External". Add yourself to "Test Users".</li>
                 </ol>
               </div>

               <div className="space-y-2">
                 <h3 className={`font-bold text-xs uppercase opacity-70 ${themeClasses.text}`}>Step B: Create Credentials</h3>
                 <ol className="list-decimal pl-5 space-y-1 text-xs">
                   <li>Go to <strong>Credentials &gt; Create Credentials &gt; OAuth Client ID</strong>.</li>
                   <li>Application Type: <strong>Web Application</strong>.</li>
                   <li>
                     <strong>Authorized Redirect URI:</strong>
                     <div className="mt-1 flex items-center gap-2">
                        <code className={`px-2 py-1 rounded text-[10px] font-mono ${themeClasses.code}`}>
                          {window.location.origin}
                        </code>
                        <button onClick={() => copyToClipboard(window.location.origin, 'origin')} className="p-1 hover:opacity-70">
                           {copied === 'origin' ? <Check className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3" />}
                        </button>
                     </div>
                   </li>
                 </ol>
               </div>
               
               <div className="space-y-2">
                 <h3 className={`font-bold text-xs uppercase opacity-70 ${themeClasses.text}`}>Step C: Generate Token</h3>
                 <ol className="list-decimal pl-5 space-y-1 text-xs">
                   <li>Copy <strong>Client ID</strong> and <strong>Client Secret</strong> from Google.</li>
                   <li>Go to <strong>Kabalikat Settings &gt; Classroom Vault</strong>.</li>
                   <li>Paste them into the generator fields.</li>
                   <li>Click "Log in with Google" to save your permanent Refresh Token.</li>
                 </ol>
               </div>
             </div>
          </div>
        </section>

      </div>
    </div>
  );
};
