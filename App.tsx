
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { 
  Bell, 
  Calendar as CalendarIcon, 
  MessageSquare, 
  ShieldCheck, 
  Clock, 
  AlertTriangle, 
  BookOpen,
  Zap, 
  Plus, 
  Image as ImageIcon, 
  User, 
  ChevronRight,
  ChevronDown,
  Loader2,
  X,
  Camera,
  Settings as SettingsIcon,
  Sun,
  Moon,
  Mail,
  Lock,
  Globe,
  LayoutDashboard,
  BarChart3,
  CheckCircle2,
  Trash2,
  Key,
  Cpu,
  Scan,
  Briefcase,
  Users,
  Smile,
  HelpCircle,
  ExternalLink,
  Info,
  CircleAlert,
  Monitor
} from 'lucide-react';
import { AppMode, UrgencyTier, LifeEvent, SentryLog, ChatMessage, RoutineItem, Theme, EmailAccount, AIKeys, AzureOCRConfig, EventCategory, AIProvider } from './types';
import { MultiProviderAIService } from './services/aiService';
import { SetupGuide } from './components/SetupGuide';
import { EmailService } from './services/emailService';
import { MemoryService, RecurrentTask } from './services/memoryService';
import { GenerateContentResponse } from '@google/genai';
import { Copy, Check } from 'lucide-react';
import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';
import { App as CapApp } from '@capacitor/app';
import { CapacitorFlash } from '@capgo/capacitor-flash';
import { KeepAwake } from '@capacitor-community/keep-awake';
import { CapgoAlarm as Alarm } from '@capgo/capacitor-alarm';
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { ClassroomService } from './services/classroomService';
import { encode, decode } from '@toon-format/toon';

const emailService = new EmailService();
const memoryService = new MemoryService();

const GOOGLE_MODELS = [
  { id: 'gemini-2.0-flash-exp', name: 'Gemini 2.0 Flash (Exp)' },
  { id: 'gemini-2.0-flash-thinking-exp-1219', name: 'Gemini 2.0 Thinking (Exp)' },
  { id: 'gemini-1.5-flash', name: 'Gemini 1.5 Flash' },
  { id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro' },
  { id: 'gemini-1.0-pro', name: 'Gemini 1.0 Pro' },
];

const OPENROUTER_MODELS = [
  { id: 'google/gemini-2.0-flash-exp:free', name: 'Gemini 2.0 Flash (Free)' },
  { id: 'meta-llama/llama-3.1-8b-instruct:free', name: 'Llama 3.1 8B (Free)' },
  { id: 'deepseek/deepseek-r1', name: 'DeepSeek R1 (Reasoner)' },
  { id: 'deepseek/deepseek-v3', name: 'DeepSeek V3' },
  { id: 'anthropic/claude-3.5-sonnet', name: 'Claude 3.5 Sonnet' },
  { id: 'openai/gpt-4o', name: 'GPT-4o' },
  { id: 'openai/o1-mini', name: 'OpenAI o1-mini' },
  { id: 'mistralai/mistral-nemo', name: 'Mistral Nemo' },
];

export default function App() {
  const [mode, setMode] = useState<AppMode>(AppMode.DASHBOARD);
  
  // Default is light (Loaded in useEffect)
  const [theme, setTheme] = useState<Theme>('light');

  // Loaded from Filesystem
  const [calendar, setCalendar] = useState<LifeEvent[]>([]);

  const [logs, setLogs] = useState<SentryLog[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [activeAlert, setActiveAlert] = useState<{ action: string, reason: string, eventId?: string } | null>(null);
  const [chatInput, setChatInput] = useState('');
  const [showCamera, setShowCamera] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const authProcessing = useRef(false);
  const [copiedOrigin, setCopiedOrigin] = useState(false);
  
  // Deduplication state for Sentry signals
  const [processedSignals, setProcessedSignals] = useState<Set<string>>(new Set());

  // Advanced Settings State
  const [emailAccounts, setEmailAccounts] = useState<EmailAccount[]>(
    [{ id: '1', email: '', appPassword: '', server: 'imap.gmail.com' }]
  );

  const [aiKeys, setAiKeys] = useState<AIKeys>(
    { provider: 'google', google: '', openai: '', openrouter: '', azure: '' }
  );

  const [azureOCR, setAzureOCR] = useState<AzureOCRConfig>(
    { endpoint: '', key: '', enabled: false }
  );

  const [isVaultSaved, setIsVaultSaved] = useState(false);
  const [setupCompleted, setSetupCompleted] = useState(false);
  const [isDataLoaded, setIsDataLoaded] = useState(false);

  // --- PLUGIN INIT & PERSISTENCE LOAD ---
  useEffect(() => {
    const initApp = async () => {
      // 1. Initialize Memory Service (Async)
      await memoryService.init();

      // 2. Load Persisted State from Filesystem
      const loadData = async (filename: string, setter: (val: any) => void) => {
        try {
          // Use Directory.Data for reliable internal storage on Android
          const ret = await Filesystem.readFile({ path: filename, directory: Directory.Data, encoding: Encoding.UTF8 });
          if (ret.data) {
             const decoded = decode(ret.data as string);
             setter(decoded);
          }
        } catch (e) { /* File likely doesn't exist yet, use default */ }
      };

      await Promise.all([
        loadData('kabalikat_theme.toon', setTheme),
        loadData('kabalikat_calendar.toon', (data: LifeEvent[]) => {
           // Basic dedupe on load
           const seen = new Set<string>();
           if (Array.isArray(data)) {
             const unique = data.filter(e => {
               const key = `${e.title}|${e.start_time}`;
               if(seen.has(key)) return false;
               seen.add(key);
               return true;
             });
             setCalendar(unique);
           }
        }),
        loadData('kabalikat_emails.toon', setEmailAccounts),
        loadData('kabalikat_ai_keys.toon', setAiKeys),
        loadData('kabalikat_azure_ocr.toon', setAzureOCR),
        loadData('kabalikat_setup.toon', setSetupCompleted),
      ]);
      
      setIsDataLoaded(true);

      if (Capacitor.isNativePlatform()) {
        try {
          // Request alarm permissions first
          try {
            const alarmPermResult = await Alarm.requestPermissions({ exactAlarm: true });
            console.log('Alarm permissions:', alarmPermResult);
          } catch (e) {
            console.log('Alarm permission request not supported or failed:', e);
          }

          await LocalNotifications.requestPermissions();
          
          // Check exact alarm settings
          try {
            const exactAlarmStatus = await LocalNotifications.checkExactNotificationSetting();
            if (exactAlarmStatus.exact_alarm !== 'granted') {
              await LocalNotifications.changeExactNotificationSetting();
            }
          } catch (e) {
            console.log('Exact alarm setting check failed:', e);
          }

          // Create channels for different urgency
          await LocalNotifications.createChannel({
            id: 'critical_alerts',
            name: 'Critical Alerts',
            description: 'For Tier 1 Alarms',
            importance: 5,
            visibility: 1,
            vibration: true
          });
          
          await LocalNotifications.createChannel({
             id: 'reminders',
             name: 'Reminders',
             description: 'General reminders',
             importance: 3,
             visibility: 1
          });

          // Background Task Listener
          CapApp.addListener('appStateChange', async ({ isActive }) => {
            if (!isActive) {
               console.log('App in background');
            }
          });

          // Handle Notification Tap to trigger Alarm Mode
          await LocalNotifications.addListener('localNotificationActionPerformed', (action) => {
             if (action.notification.extra?.type === 'alarm') {
                 setActiveAlert({ action: 'play_alarm_sound', reason: action.notification.extra.reason });
             }
          });
          
        } catch (e) {
          console.error("Plugin init error", e);
        }
      }
    };
    initApp();
  }, []);

  // Persistence (Filesystem)
  const saveToon = async (filename: string, data: any) => {
    try {
      await Filesystem.writeFile({
         path: filename,
         data: encode(data),
         directory: Directory.Data,
         encoding: Encoding.UTF8
      });
    } catch (e) { 
      console.error("Save failed", e);
      // Optional: Add a visible log for debugging specific save failures
      // addLog(UrgencyTier.TIER3, "SAVE_ERROR", `Failed to save ${filename}`);
    }
  };

  useEffect(() => {
    if (!isDataLoaded) return;
    saveToon('kabalikat_theme.toon', theme);
  }, [theme, isDataLoaded]);

  useEffect(() => {
    if (!isDataLoaded) return;
    saveToon('kabalikat_calendar.toon', calendar);
  }, [calendar, isDataLoaded]);

  useEffect(() => {
    if (!isDataLoaded) return;
    saveToon('kabalikat_emails.toon', emailAccounts);
  }, [emailAccounts, isDataLoaded]);

  useEffect(() => {
    if (!isDataLoaded) return;
    saveToon('kabalikat_ai_keys.toon', aiKeys);
  }, [aiKeys, isDataLoaded]);

  useEffect(() => {
    if (!isDataLoaded) return;
    saveToon('kabalikat_azure_ocr.toon', azureOCR);
  }, [azureOCR, isDataLoaded]);

  useEffect(() => {
     // Only save if true to avoid overwriting with initial false before load
     if (setupCompleted && isDataLoaded) {
        saveToon('kabalikat_setup.toon', true);
     }
  }, [setupCompleted, isDataLoaded]);

  // Sentry Mode - Keep Awake & Persistent Background
  useEffect(() => {
    const manageWakeLock = async () => {
       if (Capacitor.isNativePlatform()) {
          const canKeepAwake = mode === AppMode.SENTRY || mode === AppMode.COMPANION;
          if (canKeepAwake) {
             await KeepAwake.keepAwake();
          } else {
             await KeepAwake.allowSleep();
          }
       }
    };
    manageWakeLock();
  }, [mode]);

  // System Theme Listener
  const [systemIsDark, setSystemIsDark] = useState(window.matchMedia('(prefers-color-scheme: dark)').matches);
  useEffect(() => {
    const matcher = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = (e: MediaQueryListEvent) => setSystemIsDark(e.matches);
    matcher.addEventListener('change', onChange);
    return () => matcher.removeEventListener('change', onChange);
  }, []);

  // Hardware Hardware & Audio Effect for Alerts
  useEffect(() => {
    let audioCtx: AudioContext | null = null;
    let strobeInterval: any = null;

    const startAlarm = async () => {
      if (activeAlert?.action === 'play_alarm_sound' || activeAlert?.action === 'flashlight_strobe') {
        try {
          // 1. Screen Wake Lock
          if (Capacitor.isNativePlatform()) {
             await KeepAwake.keepAwake();
          }

          // 2. Flashlight Strobe
          if (Capacitor.isNativePlatform()) {
            let toggle = false;
            strobeInterval = setInterval(async () => {
              try {
                toggle = !toggle;
                if (toggle) {
                  await CapacitorFlash.switchOn({ intensity: 1.0 });
                } else {
                  await CapacitorFlash.switchOff();
                }
              } catch (e) { console.error("Flashlight error", e); }
            }, 500);
          }

          // 3. Audio (Web Audio Fallback + works when app is open)
          const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
          if (AudioContext) {
            audioCtx = new AudioContext();
            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();
            osc.connect(gain);
            gain.connect(audioCtx.destination);
            
            osc.type = 'square';
            const now = audioCtx.currentTime;
            
            const loop = () => {
                 if (audioCtx?.state === 'closed') return;
                 const t = audioCtx!.currentTime;
                 osc.frequency.setValueAtTime(880, t);
                 osc.frequency.linearRampToValueAtTime(440, t + 0.5);
                 osc.frequency.linearRampToValueAtTime(880, t + 1.0);
            };
            
            const lfo = audioCtx.createOscillator();
            lfo.type = 'sine';
            lfo.frequency.value = 2;
            const lfoGain = audioCtx.createGain();
            lfoGain.gain.value = 400;
            lfo.connect(lfoGain);
            lfoGain.connect(osc.frequency);
            osc.frequency.value = 600;

            lfo.start();
            osc.start();
            
            gain.gain.setValueAtTime(1.0, now);
          }
        } catch (e) {
          console.error("Alarm hook error", e);
        }
      }
    };

    if (activeAlert) {
        startAlarm();
    }

    return () => {
      if (audioCtx && audioCtx.state !== 'closed') audioCtx.close();
      if (strobeInterval) clearInterval(strobeInterval);
      if (Capacitor.isNativePlatform()) {
         CapacitorFlash.switchOff().catch(() => {});
         KeepAwake.allowSleep().catch(() => {});
      }
    };
  }, [activeAlert]);

  const resolvedTheme = useMemo(() => {
    if (theme === 'system') return systemIsDark ? 'dark' : 'light';
    return theme;
  }, [theme, systemIsDark]);

  const [alertedEvents, setAlertedEvents] = useState<Set<string>>(new Set());

  const addLog = useCallback((tier: UrgencyTier, action: string, reason: string) => {
    const newLog: SentryLog = {
      id: Math.random().toString(36).substr(2, 9),
      timestamp: new Date().toLocaleTimeString(),
      tier,
      action,
      reason
    };
    setLogs(prev => [newLog, ...prev]);
  }, []);

  const toggleTorch = async (enable: boolean) => {
    try {
       const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
       const track = stream.getVideoTracks()[0];
       const caps = track.getCapabilities() as any;
       if (caps.torch) {
          await track.applyConstraints({ advanced: [{ torch: enable } as any] });
          if (enable) {
             setTimeout(() => {
                track.applyConstraints({ advanced: [{ torch: false } as any] });
                track.stop();
             }, 10000);
          } else {
             track.stop();
          }
       }
    } catch (e) {
       console.error("Torch error", e);
    }
  };
  
  const scheduleReminders = useCallback(async (event: LifeEvent) => {
    if (!event.start_time) return;
    const eventTime = new Date(event.start_time).getTime();
    const now = Date.now();
    
    // 1. Native System Alarm via @capgo/capacitor-alarm (Guarantees wake up even when app killed)
    if (Capacitor.isNativePlatform() && eventTime > now) {
       try {
          const alarmDate = new Date(eventTime);
          // Only set alarm if it's within the next 24 hours
          if (eventTime - now < 24 * 60 * 60 * 1000) { 
             const result = await Alarm.createAlarm({
                hour: alarmDate.getHours(),
                minute: alarmDate.getMinutes(),
                label: `Kabalikat: ${event.title}`,
                vibrate: true,
                skipUi: true
             });
             if (result.success) {
               addLog(UrgencyTier.TIER2, 'ALARM_SYNC', `System alarm set for ${event.title} at ${alarmDate.toLocaleTimeString()}`);
             } else {
               console.log('Alarm create returned:', result.message);
             }
          }
       } catch (e: any) {
          console.error("System Alarm Set Failed", e);
          addLog(UrgencyTier.TIER3, 'ALARM_FALLBACK', `Using notification fallback for: ${event.title}`);
       }
    }

    // 2. Local Notifications (Reminders leading up to event - works even when app killed)
    const offsets = [
        { label: '2 hours', ms: 2 * 60 * 60 * 1000 },
        { label: '1 hour', ms: 1 * 60 * 60 * 1000 },
        { label: '30 minutes', ms: 30 * 60 * 1000 },
        { label: 'CRITICAL (5m)', ms: 5 * 60 * 1000 },
        { label: 'NOW', ms: 0 }
    ];

    const notifications = [];

    for (const offset of offsets) {
        const triggerAt = eventTime - offset.ms;
        if (triggerAt > now + 1000) {
            notifications.push({
                title: offset.label === 'NOW' ? `🚨 ${event.title} STARTED!` : `Reminder: ${event.title}`,
                body: offset.label === 'NOW' ? "It's time!" : `Due in ${offset.label}.`,
                id: Math.floor(Math.random() * 1000000),
                schedule: { at: new Date(triggerAt), allowWhileIdle: true },
                channelId: (offset.label.includes('CRITICAL') || offset.label === 'NOW') ? 'critical_alerts' : 'reminders',
                extra: { eventId: event.id, type: offset.label === 'NOW' ? 'alarm' : 'reminder', reason: event.title },
                ongoing: offset.label === 'NOW'
            });
        }
    }

    if (notifications.length > 0 && Capacitor.isNativePlatform()) {
        try {
           await LocalNotifications.schedule({ notifications });
        } catch (e) {
           console.error("Failed to schedule notifications", e);
        }
    }
  }, [addLog]);

  const refreshRecurringEvents = useCallback(() => {
    const mem = memoryService.getMemory();
    const todayStr = new Date().toISOString().split('T')[0];
    
    if (mem.recurring_tasks && mem.recurring_tasks.length > 0) {
      setCalendar(prev => {
        const existingIds = new Set(prev.map(e => e.id));
        const handledRecurrences = new Set(mem.handled_recurrence_ids || []);
        const newEvents: LifeEvent[] = [];

        mem.recurring_tasks.forEach(task => {
           if (task.frequency === 'daily') {
             // Create an event for Today
             const derivedId = `recur_${task.id}_${todayStr}`;
             
             if (!existingIds.has(derivedId) && !handledRecurrences.has(derivedId)) {
                let hour = 8; 
                let min = 0;
                
                const t = task.time || "08:00";
                const isPM = t.toLowerCase().includes('pm');
                const timeParts = t.replace(/[a-zA-Z\s]/g, '').split(':');
                if (timeParts.length >= 2) {
                   hour = parseInt(timeParts[0]);
                   min = parseInt(timeParts[1]);
                   if (isPM && hour < 12) hour += 12;
                   if (!isPM && t.toLowerCase().includes('am') && hour === 12) hour = 0;
                }

                const pad = (n: number) => n.toString().padStart(2, '0');
                const startT = `${todayStr}T${pad(hour)}:${pad(min)}:00`;
                const endT = `${todayStr}T${pad(hour+1)}:${pad(min)}:00`;

                const recurringEvent: LifeEvent = {
                  id: derivedId,
                  title: task.title,
                  start_time: startT,
                  end_time: endT,
                  category: (task.category as EventCategory) || 'Personal',
                  source: 'manual', 
                  completed: false
                };

                newEvents.push(recurringEvent);
                // Immediately schedule reminders/alarms for this new instance
                scheduleReminders(recurringEvent);
             }
           }
        });
        
        return [...prev, ...newEvents];
      });
    }
  }, [scheduleReminders]);

  const handleDismissAlert = () => {
    if (!activeAlert) return;
    const { eventId } = activeAlert;
    setActiveAlert(null);

    if (eventId && eventId.startsWith('recur_')) {
        setCalendar(prev => {
           // Remove from today, schedule for tomorrow
           const event = prev.find(e => e.id === eventId);
           if (!event) return prev;
           
           const nextDay = new Date(new Date(event.start_time).getTime() + 86400000);
           const parts = eventId.split('_');
           // Handle IDs that might contain underscores by rejoining middle parts
           const originalTaskId = parts.slice(1, parts.length - 1).join('_');
           const newId = `recur_${originalTaskId}_${nextDay.toISOString().split('T')[0]}`;
           
           const nextEvent = {
             ...event,
             id: newId,
             start_time: nextDay.toISOString().split('T')[0] + 'T' + event.start_time.split('T')[1],
             end_time: nextDay.toISOString().split('T')[0] + 'T' + event.end_time.split('T')[1],
             completed: false
           };

           // PERSISTENCE: Mark this specific recurrence ID as handled effectively (so it doesn't regenerate on reload)
           memoryService.markRecurrenceAsHandled(eventId);

           return [...prev.filter(e => e.id !== eventId), nextEvent];
        });
    }
  };

  useEffect(() => {
     refreshRecurringEvents();
  }, [refreshRecurringEvents]); 

  // --- CLASSROOM SYNC ---
  useEffect(() => {
    const syncClassroom = async () => {
      if (!aiKeys.googleClientId || !aiKeys.googleClientSecret || !aiKeys.classroomRefreshToken) return;

      const classroomService = new ClassroomService(
        aiKeys.googleClientId,
        aiKeys.googleClientSecret,
        aiKeys.classroomRefreshToken
      );

      try {
        const events = await classroomService.fetchAllAssignments();
        if (events.length > 0) {
          setCalendar(prev => {
            const existingIds = new Set(prev.map(e => e.id));
            const newEvents = events.filter(e => !existingIds.has(e.id));
            if (newEvents.length === 0) return prev;
            
            const updated = [...prev, ...newEvents];
            
            // Notify for new assignments
            if (Capacitor.isNativePlatform()) {
               LocalNotifications.schedule({
                 notifications: [{
                   title: 'New Classwork Detected',
                   body: `Added ${newEvents.length} new assignments to your calendar.`,
                   id: Math.floor(Math.random() * 100000),
                   schedule: { at: new Date(Date.now() + 1000) }
                 }]
               });
            }
            
            addLog(UrgencyTier.TIER2, 'CLASSROOM', `Synced ${newEvents.length} new assignments.`);
            return updated;
          });
        }
      } catch (e) {
        console.error("Classroom Sync Failed", e);
        addLog(UrgencyTier.TIER3, 'ERROR', 'Failed to sync Google Classroom.');
      }
    };

    // Sync on mount if keys exist
    syncClassroom();

    // Periodic Background Sync (Every 30 mins)
    const interval = setInterval(syncClassroom, 30 * 60 * 1000);
    return () => clearInterval(interval);
  }, [aiKeys]);

  // --- ALARM MONITOR ---
  useEffect(() => {
    const checkAlarms = () => {
      const now = new Date();
      calendar.forEach(event => {
        if (event.completed) return; // Don't alarm for done tasks

        const eventTime = new Date(event.start_time).getTime(); // Alarm at start
        const diff = eventTime - now.getTime();
        
        // Trigger if within 30 seconds of start AND not already passed too long (2 min buffer)
        if (diff > -30000 && diff < 30000) {
           // Check prevent re-alerting for the same event ID in this session
           if (alertedEvents.has(event.id)) return;

           setActiveAlert({
             action: 'play_alarm_sound',
             reason: `ALARM: ${event.title} is starting now!`,
             eventId: event.id
           });
           
           setAlertedEvents(prev => new Set(prev).add(event.id));
           addLog(UrgencyTier.TIER1, 'ALARM TRIGGERED', `Time reached for ${event.title}`);
        }
      });
    };

    const interval = setInterval(checkAlarms, 10000); // Check every 10s
    return () => clearInterval(interval);
  }, [calendar, activeAlert, alertedEvents]);





  const systemWarnings = useMemo(() => {
    const warns: { id: string, msg: string, type: 'critical' | 'warning' }[] = [];
    
    // Check Active AI Provider Key
    // Type assertion to access dynamic key safely
    const currentKey = (aiKeys as any)[aiKeys.provider];
    if (!currentKey || (currentKey as string).length < 5) {
       warns.push({ id: 'ai_key', msg: `Missing API Key for ${aiKeys.provider.toUpperCase()}`, type: 'critical' });
    }

    // Check Classroom Token (Only relevant if using Google basically, or if user expects classroom features)
    // We assume if provider is Google, they might want Classroom integration
    if (aiKeys.provider === 'google' && !aiKeys.classroomRefreshToken) {
       warns.push({ id: 'class_token', msg: 'Classroom Token inactive (Sign in with Google)', type: 'warning' });
    }

    // Check Email Passwords
    const activeEmails = emailAccounts.filter(e => e.email && e.email.length > 0);
    const missingPass = activeEmails.some(e => !e.appPassword || e.appPassword.length === 0);
    if (missingPass) {
       warns.push({ id: 'email_auth', msg: 'Email App Password missing for one or more accounts', type: 'critical' });
    }

    return warns;
  }, [aiKeys, emailAccounts, resolvedTheme]);

  // Analytics
  const stats = useMemo(() => {
    const total = calendar.length;
    const completed = calendar.filter(e => e.completed).length;
    const pending = total - completed;
    const tier1Count = logs.filter(l => l.tier === UrgencyTier.TIER1).length;
    const catCounts = calendar.reduce((acc, curr) => {
      acc[curr.category] = (acc[curr.category] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    return { total, completed, pending, tier1Count, catCounts };
  }, [calendar, logs]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // OAuth 2.0 Handler for Localhost Callback
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    const clientId = aiKeys.googleClientId;
    const clientSecret = aiKeys.googleClientSecret;

    const exchangeToken = async () => {
      if (code && clientId && clientSecret) {
          if (authProcessing.current) return;
          authProcessing.current = true;

          try {
             addLog(UrgencyTier.TIER2, 'AUTH', 'Exchanging OAuth Code for Token...');
             const res = await fetch('https://oauth2.googleapis.com/token', {
                 method: 'POST',
                 headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                 body: new URLSearchParams({
                     code,
                     client_id: clientId,
                     client_secret: clientSecret,
                     redirect_uri: window.location.origin, // e.g. http://localhost:3000
                     grant_type: 'authorization_code'
                 })
             });
             const data = await res.json();
             if (data.refresh_token) {
                 const newKeys = { ...aiKeys, classroomRefreshToken: data.refresh_token };
                 setAiKeys(newKeys);
                 addLog(UrgencyTier.TIER1, 'AUTH SUCCESS', 'Classroom Refresh Token secured in Vault!');
                 // Clear URL
                 window.history.replaceState({}, document.title, "/");
             } else {
                 // Only log error if it's not a "re-use" of a just-used code (though ref should catch this, race conditions can happen)
                 console.error("Auth Error", data);
                 addLog(UrgencyTier.TIER1, 'AUTH ERROR', JSON.stringify(data));
             }
          } catch (e) {
              console.error(e);
          } finally {
             // Keep it true to prevent re-runs until refresh. The code is one-time use anyway.
             // authProcessing.current = false; 
          }
      }
    };

    // Only run if checking for code
    if (code) exchangeToken();

  }, [aiKeys]);

  const cycleTheme = () => {
    setTheme(prev => {
      if (prev === 'light') return 'dark';
      if (prev === 'dark') return 'system';
      return 'light';
    });
  };


  // Sync Alarms whenever Calendar Changes (Debounced ideally, but here direct)
  useEffect(() => {
     if (!isDataLoaded) return;
     // Re-schedule alarms for all future events in the calendar
     // Note: This is a bit heavy as it might duplicate alarms if we don't clear old ones. 
     // But Alarm.createAlarm adds a new one. Logic should be smarter.
     // For now, let's only run this when a NEW event is added via the AI tools (which calls scheduleReminders).
     // However, for RECURRING events that are auto-generated on load, we need to schedule them.
     
     const now = Date.now();
     calendar.forEach(e => {
        // Only schedule if it looks like it hasn't been handled or is today
        // Simple heuristic: If it's today and in future, ensure it has coverage.
        const eTime = new Date(e.start_time).getTime();
        if (eTime > now && eTime - now < 24 * 60 * 60 * 1000) {
             // We can't easily check if an alarm already exists externally.
             // Rely on the fact that 'refreshRecurringEvents' adds new objects.
             // We can use a 'scheduled' flag in the event object if we wanted to be pure.
             // But since we can't edit the event object easily here without causing loops...
             
             // COMPROMISE: We will trust 'scheduleReminders' is called when events are CREATED.
             // Checking 'refreshRecurringEvents' -> it creates events. I should add scheduleReminders call THERE.
        }
     });

  }, [calendar, isDataLoaded]);

  const handleToolCalls = useCallback(async (response: GenerateContentResponse) => {
    // Robustly extract function calls from various SDK response formats
    const calls = (response as any).functionCalls 
      || response.candidates?.[0]?.content?.parts?.filter((p: any) => p.functionCall).map((p: any) => p.functionCall)
      || [];

    if (!calls || calls.length === 0) return;

    for (const call of calls) {
      const args = call.args || (call.functionCall ? call.functionCall.args : {}); // Handle different shapes
      // Clean args if they are wrapped
      const cleanArgs = args; 

      if (call.name === 'trigger_device_hardware') {
        setActiveAlert({ action: cleanArgs.action, reason: cleanArgs.reason });
        addLog(UrgencyTier.TIER1, cleanArgs.action.toUpperCase(), cleanArgs.reason);
        
        // --- HARDWARE ACTUATION ---
        if (Capacitor.isNativePlatform()) {
             if (cleanArgs.action === 'flashlight_strobe') {
                 toggleTorch(true);
             } 
        }
        
        // Auto-dismiss alert after 10s
        setTimeout(() => setActiveAlert(null), 10000);

      } else if (call.name === 'set_alarm') {
          // Instant Alarm using @capgo/capacitor-alarm
          const timeStr = cleanArgs.time;
          const label = cleanArgs.label || "Alarm";
          
          let scheduleTime = new Date(timeStr);
          
          if (Capacitor.isNativePlatform()) {
             // Use dedicated Alarm plugin for native clock behavior (works when app killed)
             try {
                const result = await Alarm.createAlarm({
                  hour: scheduleTime.getHours(),
                  minute: scheduleTime.getMinutes(),
                  label: `Kabalikat: ${label}`,
                  vibrate: true,
                  skipUi: true
                });
                
                if (!result.success) {
                  throw new Error(result.message || 'Alarm creation failed');
                }
                
                addLog(UrgencyTier.TIER1, 'ALARM SET', `Native alarm: ${label} at ${scheduleTime.toLocaleTimeString()}`);
             } catch (e) {
                console.error("Native Alarm Failed, using notification fallback", e);
                // Fallback to high-priority notification that works when app killed
                await LocalNotifications.schedule({
                   notifications: [{
                       title: `🚨 ${label}`,
                       body: "It's time!",
                       id: Math.floor(Math.random() * 1000000),
                       schedule: { at: scheduleTime, allowWhileIdle: true },
                       channelId: 'critical_alerts',
                       extra: { type: 'alarm', reason: label },
                       ongoing: true
                   }]
                });
                addLog(UrgencyTier.TIER1, 'ALARM SET', `Notification alarm: ${label} at ${scheduleTime.toLocaleTimeString()}`);
             }
          }
          
          // Personal-feeling feedback
          const hours = scheduleTime.getHours();
          const ampm = hours >= 12 ? 'PM' : 'AM';
          const h = hours % 12 || 12;
          const m = scheduleTime.getMinutes().toString().padStart(2, '0');
          const timeDisplay = `${h}:${m} ${ampm}`;
          
          setMessages(prev => [...prev, { 
             role: 'model', 
             parts: [{ text: `Got it. I'll wake you up at ${timeDisplay}. Rest easy.` }], 
             timestamp: new Date().toLocaleTimeString() 
          }]);

      } else if (call.name === 'manage_life_calendar') {
        const intent = cleanArgs.intent;
        
        if (intent === 'add_event' || !intent) {
          const newEvent: LifeEvent = {
            id: Math.random().toString(36).substr(2, 9),
            title: cleanArgs.title || 'Untitled',
            start_time: cleanArgs.start_time,
            end_time: cleanArgs.end_time,
            category: (cleanArgs.category as EventCategory) || 'Personal',
            source: cleanArgs.source || 'manual',
            recurrence: cleanArgs.recurrence
          };
          setCalendar(prev => {
             // Prevent duplicates (same title and start time)
             const exists = prev.find(e => 
               e.title === newEvent.title && 
               new Date(e.start_time).toISOString() === new Date(newEvent.start_time).toISOString()
             );
             
             if (exists) return prev;
             
             return [...prev, newEvent];
          });
          
          // Schedule 4-stage reminders
          scheduleReminders(newEvent);

          addLog(UrgencyTier.TIER2, 'Calendar Update', `Processed ${cleanArgs.category}: ${cleanArgs.title}`);
          
        } else if (intent === 'check_conflict') {
          const start = new Date(cleanArgs.start_time).getTime();
          const end = cleanArgs.end_time ? new Date(cleanArgs.end_time).getTime() : start + (60 * 60 * 1000);
          
          const conflict = calendar.find(e => {
            const eStart = new Date(e.start_time).getTime();
            const eEnd = e.end_time ? new Date(e.end_time).getTime() : eStart + (60 * 60 * 1000);
            return (start < eEnd && end > eStart);
          });

          if (conflict) {
            setActiveAlert({ 
              action: 'play_alarm_sound', 
              reason: `CONFLICT: ${cleanArgs.title} overlaps with ${conflict.title}` 
            });
            
            if(Capacitor.isNativePlatform()) {
                LocalNotifications.schedule({
                    notifications: [{
                        title: "CONFLICT DETECTED",
                        body: `${cleanArgs.title} conflicts with ${conflict.title}`,
                        id: Math.floor(Math.random() * 10000),
                        schedule: { at: new Date(Date.now() + 1000) }
                    }]
                });
            }
            
            addLog(UrgencyTier.TIER1, 'CONFLICT DETECTED', `${cleanArgs.title} conflicts with ${conflict.title}`);
          } else {
             addLog(UrgencyTier.TIER3, 'Conflict Check', `No conflict found for ${cleanArgs.title}`);
          }

        } else if (intent === 'delete_event') {
          setCalendar(prev => {
            const exists = prev.find(e => e.title === cleanArgs.title);
            if (exists) {
               addLog(UrgencyTier.TIER2, 'Calendar Update', `Deleted: ${cleanArgs.title}`);
               return prev.filter(e => e.title !== cleanArgs.title);
            }
            return prev;
          });
        }

      } else if (call.name === 'save_memory') {
        const fact = cleanArgs.fact;
        if (fact) {
           // Heuristic: If it looks like a routine, save as recurring task INSTEAD or ALSO
           // Matches "daily at 7pm", "every day at 7:00", "daily 7:15 pm"
           const lower = fact.toLowerCase();
           if (lower.includes('daily') || lower.includes('every')) {
                // Extract time (simple regex)
                const timeMatch = fact.match(/(\d{1,2}(:\d{2})?\s?(?:AM|PM|am|pm)?)/);
                const extractedTime = timeMatch ? timeMatch[0] : "08:00"; // default if missing
                
                memoryService.addRecurringTask({
                   id: Date.now().toString(),
                   title: fact,
                   category: 'Personal', // Default for meds/habits
                   frequency: 'daily',
                   time: extractedTime
                });
                // Feedback for user
                setMessages(prev => [...prev, { 
                    role: 'model', 
                    parts: [{ text: `🔄 Scheduled Routine: "${fact}"` }], 
                    timestamp: new Date().toLocaleTimeString() 
                }]);
           } else {
                memoryService.addFact(fact);
                 // Feedback for user
                setMessages(prev => [...prev, { 
                    role: 'model', 
                    parts: [{ text: `💾 Locked to Vault: "${fact}"` }], 
                    timestamp: new Date().toLocaleTimeString() 
                }]);
           }

           addLog(UrgencyTier.TIER3, 'Learned Fact', fact);
           
           // Force refresh of recurring tasks on calendar
           refreshRecurringEvents();
        }
      } else if (call.name === 'parse_and_save_routine') {
        const items: RoutineItem[] = cleanArgs.items;

        if (items && Array.isArray(items)) {
          const newEvents = items.map(i => ({
            id: Math.random().toString(36).substr(2, 9),
            title: i.subject,
            start_time: `2025-01-20T${i.time.split('-')[0].trim()}:00`, // Simple date mapping for demo
            category: i.category,
            source: 'ocr_schedule' as const,
            room: i.room
          }));
          
          setCalendar(prev => [...prev, ...newEvents]);
          // Schedule reminders
          newEvents.forEach(e => scheduleReminders(e as LifeEvent));

          addLog(UrgencyTier.TIER2, 'Routine Parsed', `Added ${items.length} routine items.`);
        }
      }
    }
  }, [addLog, calendar, scheduleReminders]);

  const sendToSentry = async (type: string, data: string, image?: string) => {
    setIsProcessing(true);
    try {
      const aiService = new MultiProviderAIService(aiKeys);
      aiService.setMemoryContext(memoryService.getContextString()); // Inject TOON memory
      const res = await aiService.processInput(`[INPUT: ${type}]: ${data}`, true, image);
      await handleToolCalls(res as any);

      // Extract text for logging if no tools were called
      const text = (res as any).text 
         || (res as any).candidates?.[0]?.content?.parts?.find((p:any) => p.text)?.text;
      const hasTools = (res as any).functionCalls 
         || (res as any).candidates?.[0]?.content?.parts?.some((p:any) => p.functionCall);

      if (text && !hasTools) {
          // If the model just speaks in Sentry mode, log it as Info
          addLog(UrgencyTier.TIER3, 'Sentry Note', text); 
      }
    } catch (e) {
      console.error(e);
      addLog(UrgencyTier.TIER3, 'Sentry Fail', 'Could not process signals.');
    } finally {
      setIsProcessing(false);
    }
  };

  // Camera Effect
  useEffect(() => {
    let stream: MediaStream | null = null;
    if (showCamera) {
      const initCamera = async () => {
         try {
           stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
           if (videoRef.current) {
             videoRef.current.srcObject = stream;
           }
         } catch (e) {
           console.error("Camera error:", e);
           setShowCamera(false);
         }
      };
      initCamera();
    }
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [showCamera]);

  const startCamera = () => {
    setShowCamera(true);
  };

  const capturePhoto = () => {
    if (!videoRef.current) return;
    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(videoRef.current, 0, 0);
      const base64 = canvas.toDataURL('image/jpeg').split(',')[1];
      sendToSentry('FILE_OCR', 'Vision analysis of physical document.', base64);
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      setShowCamera(false);
    }
  };

  const sendToChat = async () => {
    if (!chatInput.trim()) return;
    const userMsg: ChatMessage = { role: 'user', parts: [{ text: chatInput }], timestamp: new Date().toLocaleTimeString() };
    setMessages(prev => [...prev, userMsg]);
    setChatInput('');
    setIsProcessing(true);
    
    // Quick heuristic learning (client-side optimization)
    if (chatInput.toLowerCase().startsWith('i am ') || chatInput.toLowerCase().includes('my name is')) {
       await memoryService.learn(chatInput);
    }

    try {
      const aiService = new MultiProviderAIService(aiKeys);
      aiService.setMemoryContext(memoryService.getContextString()); // Inject TOON memory
      const res = await aiService.processInput(chatInput, false, undefined, messages);
      await handleToolCalls(res as any);
      
      const text = (res as any).text 
         || (res as any).candidates?.[0]?.content?.parts?.find((p:any) => p.text)?.text 
         || "I've handled that.";

      const modelMsg: ChatMessage = { role: 'model', parts: [{ text }], timestamp: new Date().toLocaleTimeString() };
      setMessages(prev => [...prev, modelMsg]);
    } catch (e: any) {
      setMessages(prev => [...prev, { role: 'model', parts: [{ text: `Error: ${e.message || "Connection failed"}` }], timestamp: new Date().toLocaleTimeString() }]);
    } finally {
      setIsProcessing(false);
    }
  };

  const themeClasses = resolvedTheme === 'dark' 
    ? { bg: 'bg-slate-950', text: 'text-slate-100', card: 'bg-slate-900/40 border-slate-800', header: 'bg-slate-950/80 border-slate-800', nav: 'bg-slate-950 border-slate-800', input: 'bg-slate-900 border-slate-800 text-white', muted: 'text-slate-500' }
    : { bg: 'bg-slate-50', text: 'text-slate-900', card: 'bg-white border-slate-200 shadow-sm', header: 'bg-white/80 border-slate-200', nav: 'bg-white border-slate-200', input: 'bg-slate-100 border-slate-200 text-slate-900', muted: 'text-slate-400' };

  const getAiLink = (provider: AIProvider) => {
    switch(provider) {
      case 'google': return 'https://aistudio.google.com/app/apikey';
      case 'openai': return 'https://platform.openai.com/api-keys';
      case 'openrouter': return 'https://openrouter.ai/keys';
      case 'azure': return 'https://portal.azure.com';
      default: return '#';
    }
  };

  // Sentry Monitor Effect (Placed here to ensure dependencies are initialized)
  useEffect(() => {
    if (mode === AppMode.SENTRY) {
      // Simulate periodic environment scanning
      const interval = setInterval(async () => {
        // Randomly simulate a "checked" log to show activity
        if (Math.random() > 0.7) {
          addLog(UrgencyTier.TIER3, 'Background Scan', 'Scanning signals: Email, Classroom, Calendar...');
        }
        
        // Check Emails
        if (Math.random() > 0.6) {
           const emails = await emailService.checkInboxes(emailAccounts);
           
           // Filter output to avoid reprocessing the exact same simulated email repeatedly
           setProcessedSignals(prev => {
              const next = new Set(prev);
              let hasChanges = false;
              
              for (const email of emails) {
                if (!next.has(email)) {
                   sendToSentry('EMAIL_INGEST', email);
                   next.add(email);
                   hasChanges = true;
                }
              }
              return hasChanges ? next : prev;
           });
        }

      }, 8000);
      return () => clearInterval(interval);
    }
  }, [mode, addLog, emailAccounts, sendToSentry]);

  return (
    <div className={`mobile-frame flex flex-col h-screen overflow-hidden ${themeClasses.bg} ${themeClasses.text} transition-colors duration-300`}>
      
      {/* INITIAL SETUP GATE */}
      {!setupCompleted && (
        <div className="fixed inset-0 z-[9999] bg-white text-slate-900 flex flex-col p-6 overflow-y-auto override-light" style={{ backgroundColor: '#ffffff', color: '#0f172a' }}>
           <div className="flex-1 flex flex-col justify-start gap-4">
              <div className="w-12 h-12 bg-indigo-600 rounded-3xl flex items-center justify-center mb-2 mt-4 shadow-lg shadow-indigo-200">
                 <ShieldCheck className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-black tracking-tight mb-2 text-slate-900">Required Permissions</h1>
                <p className="text-slate-500 font-bold text-sm">To act as your reliable Guardian, Kabalikat needs critical access to your device.</p>
              </div>

              <div className="space-y-3 pb-8">
                 <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 shadow-sm">
                    <div className="flex items-center gap-3 mb-2">
                       <Bell className="w-5 h-5 text-indigo-600" />
                       <h3 className="font-bold text-sm text-slate-900">Notifications</h3>
                    </div>
                    <p className="text-[11px] text-slate-500 mb-3 font-medium">Required for Alarms, Reminders, and Background Sentry status.</p>
                    <button 
                      onClick={async () => {
                         if (Capacitor.isNativePlatform()) {
                            await LocalNotifications.requestPermissions();
                         }
                      }}
                      className="w-full py-2.5 bg-indigo-600 text-white rounded-xl font-bold text-xs active:scale-95 transition-transform shadow-md shadow-indigo-200"
                    >
                       Request Access
                    </button>
                 </div>

                 <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 shadow-sm">
                    <div className="flex items-center gap-3 mb-2">
                       <Zap className="w-5 h-5 text-amber-500" />
                       <h3 className="font-bold text-sm text-slate-900">Unrestricted Battery</h3>
                    </div>
                    <p className="text-[11px] text-slate-500 mb-3 font-medium">CRITICAL: You MUST allow "Unrestricted" background usage, or the OS will kill the agent.</p>
                    <div className="p-3 bg-white rounded-lg border border-slate-200 mb-3">
                       <p className="text-[10px] text-slate-400 font-mono font-bold">
                         Settings {'>'} Apps {'>'} Kabalikat {'>'} Battery {'>'} Unrestricted
                       </p>
                    </div>
                    <button 
                       className="w-full py-2.5 bg-slate-800 text-white rounded-xl font-bold text-xs shadow-md"
                       onClick={() => {
                          const pkg = 'com.kabalikat.agent';
                          try {
                             if(Capacitor.getPlatform() === 'android') {
                                // Try direct battery optimization request
                                window.location.href = `intent:package:${pkg}#Intent;action=android.settings.REQUEST_IGNORE_BATTERY_OPTIMIZATIONS;end`;
                             }
                          } catch(e) { 
                              // Fallback to App Info
                             if(Capacitor.getPlatform() === 'android') {
                                window.location.href = `intent:#Intent;action=android.settings.APPLICATION_DETAILS_SETTINGS;package=${pkg};end`;
                             }
                          }
                       }}
                    >
                       Open Settings / Whitelist
                    </button>
                 </div>

                 <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 shadow-sm">
                    <div className="flex items-center gap-3 mb-2">
                       <Camera className="w-5 h-5 text-indigo-600" />
                       <h3 className="font-bold text-sm text-slate-900">Camera Access</h3>
                    </div>
                    <p className="text-[11px] text-slate-500 mb-3 font-medium">Needed for OCR Vision and visual memory capture.</p>
                    <button 
                       className="w-full py-2.5 bg-white text-indigo-600 border-2 border-indigo-100 rounded-xl font-bold text-xs"
                       onClick={async () => {
                          try {
                             await navigator.mediaDevices.getUserMedia({ video: true });
                          } catch(e) { console.error(e); }
                       }}
                    >
                       Grant Capability
                    </button>
                 </div>
                 
                 <div className="p-4 bg-red-50 rounded-2xl border border-red-100">
                    <div className="flex items-center gap-3 mb-2">
                       <CircleAlert className="w-5 h-5 text-red-500" />
                       <h3 className="font-bold text-sm text-red-600">Important Note</h3>
                    </div>
                    <p className="text-[11px] text-red-400 leading-relaxed font-bold">
                       Do not "Force Stop" the app from settings. If you need to close it, simply swipe it away. Force stopping kills all alarms and sentry modes immediately.
                    </p>
                 </div>
              </div>
           </div>

           <button 
             onClick={() => setSetupCompleted(true)}
             className="w-full py-4 bg-indigo-600 text-white font-black uppercase tracking-widest rounded-2xl active:scale-95 transition-transform mb-4 shadow-xl shadow-indigo-200 text-sm"
           >
              I Have Enabled All
           </button>
        </div>
      )}

      {/* Vision Overlay */}
      {showCamera && (
        <div className="absolute inset-0 z-[60] bg-black flex flex-col">
          <div className="p-4 flex justify-between items-center bg-black/50 backdrop-blur text-white">
            <h3 className="font-bold">Vision Sentry</h3>
            <button onClick={() => setShowCamera(false)} className="p-2 bg-white/10 rounded-full"><X className="w-6 h-6" /></button>
          </div>
          <video ref={videoRef} autoPlay playsInline className="flex-1 w-full object-cover" />
          <div className="p-12 flex flex-col items-center bg-black/80 backdrop-blur gap-4">
            {!azureOCR.enabled && (
               <div className="bg-amber-500/20 text-amber-500 p-3 rounded-2xl text-[10px] font-bold flex gap-2 items-center border border-amber-500/20 max-w-xs text-center">
                  <Info className="w-4 h-4 shrink-0" />
                  Using basic AI Vision. Enable Advanced OCR in settings for better accuracy.
               </div>
            )}
            <button onClick={capturePhoto} className="w-20 h-20 bg-white rounded-full border-4 border-slate-400 shadow-2xl active:scale-90 transition-all" />
          </div>
        </div>
      )}

      {/* Emergency Alert */}
      {activeAlert && (
        <div 
          onClick={handleDismissAlert}
          className="absolute inset-0 z-50 flex items-center justify-center p-6 alert-flash backdrop-blur-sm cursor-pointer"
        >
          <div 
             onClick={(e) => e.stopPropagation()} 
             className="bg-red-600 text-white p-8 rounded-[3rem] shadow-2xl text-center w-full max-w-sm transition-transform"
          >
            <AlertTriangle className="mx-auto mb-4 w-16 h-16 animate-pulse" />
            <h2 className="text-2xl font-black mb-2 uppercase tracking-tighter">URGENT REMINDER</h2>
            <p className="text-xl mb-6 font-bold">{activeAlert.reason}</p>
            
            <div className="flex flex-col gap-3">
              <button 
                onClick={handleDismissAlert}
                className="w-full py-4 bg-white text-red-600 font-black rounded-xl hover:bg-red-50 active:scale-95 transition-all text-lg"
              >
                DISMISS
              </button>
              <button 
                onClick={() => setActiveAlert(null)}
                className="w-full py-3 bg-red-800/50 text-white font-bold rounded-xl hover:bg-red-800 active:scale-95 transition-all text-sm uppercase tracking-widest"
              >
                Snooze (10m)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <header className={`p-4 flex items-center justify-between border-b ${themeClasses.header} backdrop-blur-md sticky top-0 z-10`}>
        <div className="flex items-center gap-3">
          <svg width="40" height="32" viewBox="0 0 333 262" fill="none" xmlns="http://www.w3.org/2000/svg" className="drop-shadow-lg">
             <path fillRule="evenodd" clipRule="evenodd" d="M112 220V262H0V135.5L21 156.5L20.8877 166.111L21 166L185 0.5H332.5L112 220ZM21.5 193.993V194L20.5527 194.946L20 242.5H91.5V211L281.5 20.5H193L21.5 193.993Z" fill={resolvedTheme === 'dark' ? "#EFEFFE" : "#484249"}/>
             <path d="M282 242.5L150.5 112C133.577 121.65 126.39 121.638 118.5 110L148 90.0001C152.491 88.4263 155.009 88.4995 159.5 90.0001L333 262H182L139.5 213.5L154 199L193.5 242.5H282Z" fill="#8E8BB4"/>
             <path d="M112.5 53.5L92 74V20H21V106.5L65 150.5L65.4717 151.019C82.5441 169.815 92.2614 180.513 105.5 178.5C89.3799 203.925 76.0982 191.913 51.5 166L0.5 114.5V0H112.5V53.5Z" fill="#4F46E5"/>
          </svg>
          <div>
            <h1 className="font-black text-lg tracking-tight leading-none">Kabalikat</h1>
            <div className="flex items-center gap-1 mt-1">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[8px] uppercase tracking-widest font-black opacity-40">{mode}</span>
            </div>
          </div>
        </div>
        <button 
          onClick={cycleTheme} 
          className={`p-2 rounded-xl transition-all flex items-center gap-2 ${resolvedTheme === 'dark' ? 'hover:bg-slate-800 text-amber-400' : 'hover:bg-slate-100 text-slate-600 shadow-sm'}`}
          title={`Theme: ${theme}`}
        >
          {theme === 'light' && <Sun className="w-5 h-5" />}
          {theme === 'dark' && <Moon className="w-5 h-5" />}
          {theme === 'system' && <Monitor className="w-5 h-5" />}
          {theme === 'system' && <span className="text-[8px] font-black uppercase tracking-widest">System</span>}
        </button>
      </header>

      {/* Main Container */}
      <main className="flex-1 overflow-y-auto p-4 space-y-6">
        
        {mode === AppMode.DASHBOARD && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
            <div className="flex items-center justify-between px-1">
              <h2 className="text-2xl font-black tracking-tighter">My Lifeboard</h2>
              <div className="text-[10px] font-black opacity-30 uppercase tracking-widest">{new Date().toLocaleDateString()}</div>
            </div>

            <div className="grid grid-cols-2 gap-4">
               <div className={`${themeClasses.card} p-6 rounded-[2.5rem] border shadow-sm`}>
                  <CheckCircle2 className="w-6 h-6 text-emerald-500 mb-2" />
                  <div className="text-3xl font-black">{stats.completed}</div>
                  <div className="text-[9px] font-black uppercase tracking-widest opacity-40">Tasks Done</div>
               </div>
               <div className={`${themeClasses.card} p-6 rounded-[2.5rem] border shadow-sm`}>
                  <AlertTriangle className="w-6 h-6 text-red-500 mb-2" />
                  <div className="text-3xl font-black">{stats.tier1Count}</div>
                  <div className="text-[9px] font-black uppercase tracking-widest opacity-40">Critical Alerts</div>
               </div>
            </div>

            <section className={`${themeClasses.card} p-8 rounded-[3rem] border shadow-sm`}>
               <h3 className="text-[10px] font-black uppercase tracking-[0.25em] opacity-40 mb-6 flex items-center gap-2">
                 <BarChart3 className="w-4 h-4" /> Focus Distribution
               </h3>
               <div className="space-y-5">
                  {['Academic', 'Work', 'Organization', 'Personal'].map(cat => {
                    const count = stats.catCounts[cat] || 0;
                    const pct = stats.total > 0 ? (count / stats.total) * 100 : 0;
                    return (
                      <div key={cat} className="space-y-1.5">
                        <div className="flex justify-between text-[11px] font-black">
                          <span className="opacity-60">{cat}</span>
                          <span className="text-indigo-500">{count} items</span>
                        </div>
                        <div className="h-2 w-full bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                          <div className={`h-full rounded-full transition-all duration-1000 ${cat === 'Academic' ? 'bg-blue-500' : cat === 'Work' ? 'bg-amber-500' : cat === 'Organization' ? 'bg-purple-500' : 'bg-emerald-500'}`} style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    );
                  })}
               </div>
            </section>

            <section className="space-y-4">
              <h3 className="text-[10px] font-black uppercase tracking-widest opacity-40 px-1">Recent Intelligence</h3>
              {logs.slice(0, 3).map(log => (
                <div key={log.id} className={`${themeClasses.card} p-4 rounded-[1.75rem] border flex items-center gap-4`}>
                   <div className={`p-2 rounded-xl ${log.tier === UrgencyTier.TIER1 ? 'bg-red-500/10 text-red-500' : 'bg-indigo-500/10 text-indigo-500'}`}>
                      {log.tier === UrgencyTier.TIER1 ? <AlertTriangle className="w-4 h-4" /> : <ShieldCheck className="w-4 h-4" />}
                   </div>
                   <div className="flex-1 truncate">
                      <p className="text-xs font-black truncate">{log.action}</p>
                      <p className="text-[9px] opacity-40 mt-1 truncate">{log.reason}</p>
                   </div>
                </div>
              ))}
            </section>
          </div>
        )}

        {mode === AppMode.SENTRY && (
          <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
            {systemWarnings.length > 0 && (
              <div className="space-y-2 mb-4">
                 {systemWarnings.map(warn => (
                    <div key={warn.id} className={`p-4 rounded-[2rem] border flex items-center gap-3 shadow-sm ${
                        warn.type === 'critical' ? 'bg-red-500/10 border-red-500/20 text-red-600 dark:text-red-400' : 'bg-amber-500/10 border-amber-500/20 text-amber-600 dark:text-amber-400'
                    }`}>
                       <div className={`p-2 rounded-full ${warn.type === 'critical' ? 'bg-red-500 text-white' : 'bg-amber-500 text-white'}`}>
                          <AlertTriangle className="w-4 h-4" />
                       </div>
                       <div className="flex-1">
                          <p className="font-black text-[10px] uppercase tracking-widest opacity-60">System Attention Needed</p>
                          <p className="text-xs font-bold leading-tight">{warn.msg}</p>
                       </div>
                       <button onClick={() => setMode(AppMode.SETTINGS)} className="p-2 bg-white/50 dark:bg-black/20 rounded-xl hover:scale-105 transition-transform">
                          <SettingsIcon className="w-4 h-4" />
                       </button>
                    </div>
                 ))}
              </div>
            )}

            <h2 className="text-2xl font-black px-1 tracking-tight">Sentry Active</h2>
            <div className="space-y-3">
              {logs.length === 0 ? (
                <div className={`${themeClasses.card} p-12 rounded-[3rem] border-dashed text-center opacity-40`}>
                  <ShieldCheck className="w-14 h-14 mx-auto mb-4 opacity-20" />
                  <p className="text-sm font-black italic">Monitoring campus and work streams...</p>
                </div>
              ) : (
                logs.map(log => (
                  <div key={log.id} className={`${themeClasses.card} p-5 rounded-[2rem] border flex gap-4`}>
                    <div className={`p-2.5 rounded-xl h-fit ${log.tier === UrgencyTier.TIER1 ? 'bg-red-500/10 text-red-500' : 'bg-indigo-500/10 text-indigo-500'}`}>
                      {log.tier === UrgencyTier.TIER1 ? <AlertTriangle className="w-5 h-5" /> : <Bell className="w-5 h-5" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-[8px] font-black uppercase tracking-widest opacity-40">{log.tier}</span>
                        <span className="text-[9px] opacity-30 font-bold">{log.timestamp}</span>
                      </div>
                      <p className="font-black text-sm">{log.action}</p>
                      <p className="text-[11px] mt-1.5 opacity-60 font-medium leading-relaxed">{log.reason}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
            
            <section className="bg-indigo-600 p-8 rounded-[3rem] text-white shadow-xl relative overflow-hidden group">
               <div className="relative z-10">
                 <h3 className="text-2xl font-black mb-1 tracking-tighter">Kabalikat Vision</h3>
                 <p className="text-xs text-indigo-100 opacity-80 mb-6 font-bold">Instantly extract schedules or work rotas from photos.</p>
                 <div className="grid grid-cols-2 gap-3">
                    <button onClick={startCamera} className="bg-white/20 p-4 rounded-2xl font-black text-xs flex items-center justify-center gap-2 active:scale-95 transition-all border border-white/10">
                      <Camera className="w-4 h-4" /> Snap Photo
                    </button>
                    <label className="bg-white text-indigo-700 p-4 rounded-2xl font-black text-xs flex items-center justify-center gap-2 cursor-pointer active:scale-95 transition-all">
                      <ImageIcon className="w-4 h-4" /> Gallery
                      <input type="file" className="hidden" accept="image/*" onChange={(e) => {
                         const f = e.target.files?.[0];
                         if (f) {
                            const r = new FileReader();
                            r.onload = () => sendToSentry('FILE_OCR', 'Image from library.', (r.result as string).split(',')[1]);
                            r.readAsDataURL(f);
                         }
                      }} />
                    </label>
                 </div>
               </div>
               <Zap className="absolute -bottom-8 -right-8 w-40 h-40 opacity-10 rotate-12" />
            </section>
          </div>
        )}

        {mode === AppMode.COMPANION && (
          <div className="flex flex-col h-full animate-in slide-in-from-right-4">
            <div className="flex justify-between items-center px-1 mb-2">
                <span className="text-[10px] font-black uppercase tracking-widest opacity-40">Messages</span>
                <button 
                  onClick={() => setMessages([])}
                  className="p-2 text-[10px] font-black uppercase tracking-widest text-red-500 hover:bg-red-500/10 rounded-lg flex items-center gap-1 transition-colors opacity-70 hover:opacity-100"
                >
                  <Trash2 className="w-3 h-3" /> Clear History
                </button>
            </div>
            <div className="flex-1 space-y-4 pb-24 overflow-y-auto">
              {messages.length === 0 && (
                <div className="flex flex-col items-center justify-center h-full text-center p-10 opacity-80">
                  <div className="w-24 h-24 bg-indigo-600 rounded-[3rem] flex items-center justify-center mb-6 shadow-2xl">
                    <User className="text-white w-10 h-10" />
                  </div>
                  <h2 className="text-2xl font-black mb-2 tracking-tighter">Companion Active</h2>
                  <p className={`${themeClasses.muted} text-sm max-w-[200px] font-bold`}>How's life, sibling? I can help with tasks or just listen.</p>
                </div>
              )}
              {messages.map((m, i) => (
                <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[85%] p-4 rounded-[1.75rem] text-sm font-bold leading-relaxed ${
                    m.role === 'user' ? 'bg-indigo-600 text-white rounded-tr-none' : `${themeClasses.card} border rounded-tl-none`
                  }`}>
                    {m.parts[0].text}
                    <div className={`text-[8px] mt-2 opacity-30 font-black ${m.role === 'user' ? 'text-right' : 'text-left'}`}>{m.timestamp}</div>
                  </div>
                </div>
              ))}
              <div ref={chatEndRef} />
            </div>
            
            <div className={`fixed bottom-20 left-0 right-0 max-w-[480px] mx-auto p-4 ${themeClasses.bg} border-t ${themeClasses.header} z-30 transition-all`}>
              <div className={`flex items-center gap-2 ${themeClasses.input} border rounded-[2rem] p-1.5 shadow-sm`}>
                <input 
                  type="text" 
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && sendToChat()}
                  placeholder="Tell me something..."
                  className="flex-1 bg-transparent border-none focus:ring-0 text-sm py-2 px-3 placeholder-slate-500 font-black"
                />
                <button onClick={sendToChat} disabled={isProcessing} className="p-3 bg-indigo-600 text-white rounded-[1.25rem] transition-all shadow-xl active:scale-95">
                  {isProcessing ? <Loader2 className="w-5 h-5 animate-spin" /> : <ChevronRight className="w-5 h-5" />}
                </button>
              </div>
            </div>
          </div>
        )}

        {mode === AppMode.CALENDAR && (
          <div className="space-y-6 animate-in slide-in-from-right-4 pb-10">
            <h2 className="text-2xl font-black px-1 tracking-tight">Life Schedule</h2>
            <div className="space-y-4">
              {calendar.length === 0 ? (
                <div className={`${themeClasses.card} p-16 rounded-[3.5rem] border-dashed text-center opacity-40`}>
                  <CalendarIcon className="w-12 h-12 mx-auto mb-4 opacity-10" />
                  <p className="font-black italic text-xs uppercase tracking-widest">Clean slate today.</p>
                </div>
              ) : (
                calendar
                  .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime())
                  .map(event => (
                  <div key={event.id} className={`${themeClasses.card} border p-6 rounded-[2.5rem] flex items-center justify-between shadow-sm`}>
                    <div className="flex-1 min-w-0 mr-4">
                      <div className="flex items-center gap-2 mb-2">
                        <div className={`w-2 h-2 rounded-full ${event.category === 'Work' ? 'bg-amber-500' : event.category === 'Academic' ? 'bg-blue-500' : 'bg-purple-500'}`} />
                        <span className="text-[8px] font-black uppercase tracking-[0.2em] opacity-30">{event.category}</span>
                      </div>
                      <h4 className={`font-black text-sm leading-tight truncate ${event.completed ? 'line-through opacity-20' : ''}`}>{event.title}</h4>
                      <div className="flex items-center gap-1.5 text-[9px] font-bold opacity-30 mt-2 uppercase tracking-tighter">
                        <Clock className="w-3.5 h-3.5" />
                        <span>{new Date(event.start_time).toLocaleDateString([], { month: 'short', day: 'numeric' })} @ {new Date(event.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                    </div>
                    <button 
                      onClick={() => setCalendar(prev => prev.map(e => e.id === event.id ? {...e, completed: !e.completed} : e))}
                      className={`w-12 h-12 rounded-[1.5rem] flex items-center justify-center transition-all shadow-sm ${event.completed ? 'bg-emerald-500 text-white' : 'bg-slate-500/10 text-slate-400'}`}
                    >
                       <CheckCircle2 className="w-6 h-6" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {mode === AppMode.SETTINGS && (
          <div className="space-y-8 animate-in slide-in-from-right-4 pb-32">
            <div className="flex items-center justify-between px-1">
               <h2 className="text-3xl font-black tracking-tighter">Vault Prefs</h2>
               <button onClick={() => setMode(AppMode.GUIDE)} className="flex items-center gap-2 px-4 py-2 bg-indigo-500/10 text-indigo-500 rounded-full hover:bg-indigo-500 hover:text-white transition-all font-black text-[10px] uppercase tracking-widest">
                  <BookOpen className="w-4 h-4" />
                  <span>Setup Guide</span>
               </button>
            </div>

            {/* Appearance Section */}
            <section className={`${themeClasses.card} border p-7 rounded-[3rem] space-y-6 shadow-sm`}>
               <div className="flex items-center gap-3.5 border-b ${themeClasses.muted} pb-5">
                  <div className="p-2.5 bg-indigo-500/10 text-indigo-600 rounded-[1rem]"><Globe className="w-5 h-5" /></div>
                  <h3 className="font-black text-xs uppercase tracking-[0.25em] opacity-40">Appearance</h3>
               </div>
               <div className="grid grid-cols-3 gap-2">
                  {(['light', 'dark', 'system'] as Theme[]).map(t => (
                    <button 
                      key={t}
                      onClick={() => setTheme(t)}
                      className={`py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest border transition-all ${theme === t ? 'bg-indigo-600 text-white border-indigo-600 shadow-md' : `${themeClasses.card} border-slate-200 dark:border-slate-800 opacity-60`}`}
                    >
                      {t}
                    </button>
                  ))}
               </div>
            </section>
            
            {/* AI Intelligence Provider Selection */}
            <section className={`${themeClasses.card} border p-7 rounded-[3rem] space-y-6 shadow-sm relative overflow-hidden`}>
               <div className="flex items-center justify-between border-b ${themeClasses.muted} pb-5">
                  <div className="flex items-center gap-3.5">
                     <div className="p-2.5 bg-indigo-500/10 text-indigo-600 rounded-[1rem]"><Cpu className="w-5 h-5" /></div>
                     <h3 className="font-black text-xs uppercase tracking-[0.25em] opacity-40">Intelligence Core</h3>
                  </div>
                   <button onClick={() => setMode(AppMode.GUIDE)} className="p-2 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-full transition-colors text-indigo-400">
                      <HelpCircle className="w-4 h-4" />
                   </button>
               </div>

               <div className="space-y-6">
                  <div>
                    <label className="text-[9px] font-black uppercase tracking-[0.25em] opacity-40 ml-1 mb-2 block">Primary AI Provider</label>
                    <div className="relative">
                      <select 
                        value={aiKeys.provider}
                        onChange={e => setAiKeys({...aiKeys, provider: e.target.value as AIProvider})}
                        className={`w-full ${themeClasses.input} p-4 rounded-2xl font-black text-xs appearance-none outline-none focus:ring-2 ring-indigo-500/20`}
                      >
                        <option value="google">Google Gemini</option>
                        <option value="openai">OpenAI (ChatGPT)</option>
                        <option value="openrouter">OpenRouter (Any LLM)</option>
                        <option value="azure">Azure OpenAI</option>
                      </select>
                      <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 opacity-30 pointer-events-none" />
                    </div>
                  </div>

                  {aiKeys.provider !== 'google' && (
                    <div>
                      <label className="text-[9px] font-black uppercase tracking-[0.25em] opacity-40 ml-1 mb-2 block">Provider API Key</label>
                      <div className="relative">
                        <input 
                          type="password" 
                          value={aiKeys[aiKeys.provider] || ''}
                          onChange={e => setAiKeys({...aiKeys, [aiKeys.provider]: e.target.value})}
                          placeholder={`Enter your ${aiKeys.provider} key`}
                          className={`w-full ${themeClasses.input} p-4 pr-12 rounded-2xl font-black text-xs outline-none focus:ring-2 ring-indigo-500/20`}
                        />
                        <Key className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 opacity-20" />
                      </div>
                      <div className="mt-3 flex items-center justify-between px-1">
                        <a href={getAiLink(aiKeys.provider)} target="_blank" className="text-[10px] font-black text-indigo-500 flex items-center gap-1 hover:underline">
                            <ExternalLink className="w-3 h-3" /> Get {aiKeys.provider} Key
                        </a>
                      </div>
                    </div>
                  )}

                  {aiKeys.provider === 'google' && (
                    <div className="space-y-4">
                      <div>
                        <label className="text-[9px] font-black uppercase tracking-[0.25em] opacity-40 ml-1 mb-2 block">Google API Key</label>
                        <div className="relative">
                          <input 
                            type="password" 
                            value={aiKeys.google || ''}
                            onChange={e => setAiKeys({...aiKeys, google: e.target.value})}
                            placeholder="Enter Gemini API Key"
                            className={`w-full ${themeClasses.input} p-4 pr-12 rounded-2xl font-black text-xs outline-none focus:ring-2 ring-indigo-500/20`}
                          />
                          <Key className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 opacity-20" />
                        </div>
                        <div className="mt-3 flex items-center justify-between px-1">
                          <a href="https://aistudio.google.com/app/apikey" target="_blank" className="text-[10px] font-black text-indigo-500 flex items-center gap-1 hover:underline">
                              <ExternalLink className="w-3 h-3" /> Get Gemini Key
                          </a>
                        </div>
                      </div>
                      <div className="flex gap-2 items-center">
                         <div className="bg-indigo-500/10 p-2 rounded-lg"><Cpu className="w-3 h-3 text-indigo-500" /></div>
                         <div className="relative flex-1">
                           <select 
                             value={aiKeys.googleModel || 'gemini-2.0-flash-exp'} 
                             onChange={e => setAiKeys({...aiKeys, googleModel: e.target.value})}
                             className={`w-full ${themeClasses.input} p-3 rounded-xl font-bold text-[10px] outline-none appearance-none`}
                           >
                             {GOOGLE_MODELS.map(m => (
                               <option key={m.id} value={m.id}>{m.name}</option>
                             ))}
                           </select>
                           <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3 h-3 opacity-30 pointer-events-none" />
                         </div>
                      </div>
                    </div>
                  )}

                  {aiKeys.provider === 'openrouter' && (
                     <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-800">
                        <label className="text-[9px] font-black uppercase tracking-[0.25em] opacity-40 ml-1 mb-2 block">Model Selection</label>
                        <div className="relative">
                          <select 
                            value={aiKeys.openrouterModel || 'google/gemini-2.0-flash-exp:free'} 
                            onChange={e => setAiKeys({...aiKeys, openrouterModel: e.target.value})}
                            className={`w-full ${themeClasses.input} p-3 rounded-xl font-bold text-[10px] outline-none appearance-none`}
                          >
                            {OPENROUTER_MODELS.map(m => (
                              <option key={m.id} value={m.id}>{m.name}</option>
                            ))}
                          </select>
                          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3 h-3 opacity-30 pointer-events-none" />
                        </div>
                     </div>
                  )}

                  {aiKeys.provider === 'openai' && (
                     <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-800">
                        <label className="text-[9px] font-black uppercase tracking-[0.25em] opacity-40 ml-1 mb-2 block">Model Selection</label>
                        <input 
                           type="text"
                           value={aiKeys.openaiModel || 'gpt-4o'}
                           onChange={e => setAiKeys({...aiKeys, openaiModel: e.target.value})}
                           className={`w-full ${themeClasses.input} p-3 rounded-xl font-bold text-[10px] outline-none`}
                           placeholder="e.g. gpt-4o, gpt-3.5-turbo" 
                        />
                     </div>
                  )}

                  {aiKeys.provider === 'azure' && (
                     <div className="space-y-4 mt-4 pt-4 border-t border-slate-200 dark:border-slate-800">
                        <div>
                          <label className="text-[9px] font-black uppercase tracking-[0.25em] opacity-40 ml-1 mb-2 block">Endpoint URL</label>
                          <input 
                             type="text"
                             value={aiKeys.azureEndpoint || ''}
                             onChange={e => setAiKeys({...aiKeys, azureEndpoint: e.target.value})}
                             className={`w-full ${themeClasses.input} p-3 rounded-xl font-bold text-[10px] outline-none`}
                             placeholder="https://your-resource.openai.azure.com" 
                          />
                        </div>
                         <div>
                          <label className="text-[9px] font-black uppercase tracking-[0.25em] opacity-40 ml-1 mb-2 block">Deployment Name</label>
                          <input 
                             type="text"
                             value={aiKeys.azureDeployment || ''}
                             onChange={e => setAiKeys({...aiKeys, azureDeployment: e.target.value})}
                             className={`w-full ${themeClasses.input} p-3 rounded-xl font-bold text-[10px] outline-none`}
                             placeholder="e.g. my-gpt4-deploy" 
                          />
                        </div>
                     </div>
                  )}

                  {!azureOCR.enabled && aiKeys.provider !== 'google' && (
                     <div className="p-4 bg-indigo-500/5 rounded-2xl border border-indigo-500/10 flex gap-3">
                        <CircleAlert className="w-4 h-4 text-indigo-500 shrink-0 mt-0.5" />
                        <p className="text-[10px] font-bold text-indigo-500 leading-relaxed">
                          Note: Selected AI might not support document vision natively. Enable Advanced OCR (Azure) below if Vision Sentry fails.
                        </p>
                     </div>
                  )}

                  {/* Custom Persona Configuration */}
                  <div className="mt-8 pt-6 border-t border-slate-200 dark:border-slate-800">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="bg-indigo-500/10 p-2 rounded-lg"><Smile className="w-3 h-3 text-indigo-500" /></div>
                      <label className="text-[9px] font-black uppercase tracking-[0.25em] opacity-40 block">Agent Persona</label>
                    </div>
                    <textarea 
                       value={aiKeys.customPersona || ''}
                       onChange={e => setAiKeys({...aiKeys, customPersona: e.target.value})}
                       className={`w-full ${themeClasses.input} p-4 rounded-2xl font-bold text-[11px] outline-none min-h-[100px] resize-none leading-relaxed`}
                       placeholder="Default: Reliable, 'Kuya/Ate' (Older Sibling) figure. Protective, sharp, and organized.&#10;&#10;Customize here (e.g., 'You are a formal Butler...', 'You are a sarcastic robot...')" 
                    />
                  </div>
               </div>
            </section>

            {/* Email Accounts */}
            <section className={`${themeClasses.card} border p-7 rounded-[3rem] space-y-7 shadow-sm`}>
               <div className="flex items-center justify-between border-b ${themeClasses.muted} pb-5">
                  <div className="flex items-center gap-3.5">
                    <div className="p-2.5 bg-indigo-500/10 text-indigo-600 rounded-[1rem]"><Mail className="w-5 h-5" /></div>
                    <h3 className="font-black text-xs uppercase tracking-[0.25em] opacity-40">Email Signals</h3>
                  </div>
                  <div className="flex items-center gap-2">
                     <button onClick={() => setMode(AppMode.GUIDE)} className="p-2 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-full transition-colors text-indigo-400">
                        <HelpCircle className="w-4 h-4" />
                     </button>
                     <button onClick={() => setEmailAccounts([...emailAccounts, { id: Math.random().toString(36).substr(2, 9), email: '', appPassword: '', server: 'imap.gmail.com' }])} className="p-2 bg-indigo-500 text-white rounded-full hover:bg-indigo-700 transition-all shadow-lg active:scale-95"><Plus className="w-5 h-5" /></button>
                  </div>
               </div>

               <div className="space-y-4">
                  {emailAccounts.map((acc, index) => (
                    <div key={acc.id} className={`p-5 rounded-[2.5rem] border ${resolvedTheme === 'dark' ? 'bg-slate-900/30 border-slate-800' : 'bg-slate-50 border-slate-100'} group relative`}>
                      <button onClick={() => setEmailAccounts(emailAccounts.filter(a => a.id !== acc.id))} className="absolute -top-2 -right-2 p-2 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-all shadow-xl"><Trash2 className="w-3.5 h-3.5" /></button>
                      <input 
                        type="email" 
                        placeholder="Email Address" 
                        value={acc.email}
                        onChange={e => {
                          const n = [...emailAccounts]; n[index].email = e.target.value; setEmailAccounts(n);
                        }}
                        className="w-full bg-transparent border-none p-0 text-sm font-black focus:ring-0 placeholder-slate-600 mb-3"
                      />
                      <div className="flex gap-2">
                         <input 
                          type="password" 
                          placeholder="App Password" 
                          value={acc.appPassword}
                          onChange={e => {
                            const n = [...emailAccounts]; n[index].appPassword = e.target.value; setEmailAccounts(n);
                          }}
                          className={`flex-1 ${resolvedTheme === 'dark' ? 'bg-slate-950/50' : 'bg-white'} p-3 rounded-xl text-[10px] font-black border ${resolvedTheme === 'dark' ? 'border-slate-800' : 'border-slate-200'} outline-none focus:ring-2 ring-indigo-500/10`}
                        />
                        <div className="relative w-32">
                          <select 
                            value={acc.server}
                            onChange={e => {
                              const n = [...emailAccounts]; n[index].server = e.target.value; setEmailAccounts(n);
                            }}
                            className={`w-full ${resolvedTheme === 'dark' ? 'bg-slate-950/50' : 'bg-white'} p-3 pr-8 rounded-xl text-[10px] font-black border ${resolvedTheme === 'dark' ? 'border-slate-800' : 'border-slate-200'} outline-none appearance-none focus:ring-2 ring-indigo-500/10`}
                          >
                             <option value="imap.gmail.com">Gmail (IMAP)</option>
                             <option value="outlook.office365.com">Outlook (365)</option>
                          </select>
                           <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3 h-3 opacity-50 pointer-events-none" />
                        </div>
                      </div>
                    </div>
                  ))}
               </div>
            </section>

             {/* Education Integration */}
             <section className={`${themeClasses.card} border p-7 rounded-[3rem] space-y-7 shadow-sm`}>
               <div className="flex items-center justify-between border-b ${themeClasses.muted} pb-5">
                  <div className="flex items-center gap-3.5">
                    <div className="p-2.5 bg-indigo-500/10 text-indigo-600 rounded-[1rem]"><BookOpen className="w-5 h-5" /></div>
                    <div className="flex flex-col">
                        <h3 className="font-black text-xs uppercase tracking-[0.25em] opacity-40">Classroom Vault</h3>
                    </div>
                  </div>
                   <button onClick={() => setMode(AppMode.GUIDE)} className="p-2 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-full transition-colors text-indigo-400">
                      <HelpCircle className="w-4 h-4" />
                   </button>
               </div>
               
               <div className="space-y-4">
                 
                 <div className={`${resolvedTheme === 'dark' ? 'bg-slate-900/50 border-slate-800' : 'bg-slate-50 border-slate-200'} p-4 rounded-xl space-y-3 mb-4 border border-dashed`}>
                    <div className="flex justify-between items-center mb-2">
                        <h4 className={`text-[10px] font-black uppercase tracking-widest ${resolvedTheme === 'dark' ? 'text-indigo-400' : 'text-indigo-600'}`}>Generate Token (Localhost Only)</h4>
                         <button onClick={() => setMode(AppMode.GUIDE)} className="text-[9px] font-bold text-indigo-500 hover:underline">
                           NEED HELP?
                         </button>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                        <input 
                            type="text" 
                            placeholder="Client ID (GCP)"
                            value={aiKeys.googleClientId || ''}
                            onChange={e => setAiKeys({...aiKeys, googleClientId: e.target.value})}
                            className={`w-full ${themeClasses.input} p-3 rounded-xl font-bold text-[10px] outline-none`}
                        />
                        <input 
                            type="password" 
                            placeholder="Client Secret"
                            value={aiKeys.googleClientSecret || ''}
                            onChange={e => setAiKeys({...aiKeys, googleClientSecret: e.target.value})}
                            className={`w-full ${themeClasses.input} p-3 rounded-xl font-bold text-[10px] outline-none`}
                        />
                    </div>
                    {aiKeys.googleClientId && aiKeys.googleClientSecret && (
                        <button 
                            onClick={() => {
                                const redirectUri = Capacitor.isNativePlatform() ? 'https://localhost' : window.location.origin;
                                const scope = "https://www.googleapis.com/auth/classroom.courses.readonly https://www.googleapis.com/auth/classroom.coursework.me.readonly https://www.googleapis.com/auth/classroom.student-submissions.me.readonly";
                                const url = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${aiKeys.googleClientId}&redirect_uri=${redirectUri}&response_type=code&scope=${encodeURIComponent(scope)}&access_type=offline&prompt=consent`;
                                window.location.href = url;
                            }}
                            className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold text-xs shadow-lg active:scale-95 transition-all"
                        >
                            Log in with Google (Generate Token)
                        </button>
                    )}
                    
                    <div className={`mt-2 pt-2 border-t ${resolvedTheme === 'dark' ? 'border-slate-800' : 'border-slate-200'}`}>
                        <label className="text-[9px] font-black uppercase tracking-widest opacity-50 block mb-1">
                            Authorized Redirect URI (Add to GCP)
                        </label>
                        <div className={`flex items-center gap-2 p-2 rounded-lg ${resolvedTheme === 'dark' ? 'bg-slate-950/50' : 'bg-slate-200'}`}>
                            <code className="text-[10px] font-mono flex-1 overflow-hidden text-ellipsis whitespace-nowrap opacity-80 select-all">
                                {Capacitor.isNativePlatform() ? 'https://localhost' : window.location.origin}
                            </code>
                            <button 
                              onClick={() => {
                                navigator.clipboard.writeText(Capacitor.isNativePlatform() ? 'https://localhost' : window.location.origin);
                                setCopiedOrigin(true);
                                setTimeout(() => setCopiedOrigin(false), 2000);
                              }}
                              className="p-1 hover:bg-slate-300 dark:hover:bg-slate-800 rounded transition-colors"
                            >
                                {copiedOrigin ? <Check className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3 opacity-50" />}
                            </button>
                        </div>
                    </div>
                 </div>

                 <input 
                   type="password" 
                   value={aiKeys.classroomRefreshToken || ''}
                   onChange={e => setAiKeys({...aiKeys, classroomRefreshToken: e.target.value})}
                   placeholder="Google Classroom Refresh Token (OAuth)"
                   className={`w-full ${themeClasses.input} p-4 rounded-2xl font-black text-xs outline-none focus:ring-2 ring-indigo-500/10`}
                 />
               </div>
            </section>

            {/* Azure Advanced OCR Config */}
            <section className={`${themeClasses.card} border p-7 rounded-[3rem] space-y-7 shadow-sm`}>
               <div className="flex items-center justify-between border-b ${themeClasses.muted} pb-5">
                  <div className="flex items-center gap-3.5">
                    <div className="p-2.5 bg-indigo-500/10 text-indigo-600 rounded-[1rem]"><Scan className="w-5 h-5" /></div>
                    <h3 className="font-black text-xs uppercase tracking-[0.25em] opacity-40">Advanced OCR</h3>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" checked={azureOCR.enabled} onChange={() => setAzureOCR({...azureOCR, enabled: !azureOCR.enabled})} className="sr-only peer" />
                    <div className="w-12 h-7 bg-slate-300 dark:bg-slate-800 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[4px] after:left-[4px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600" />
                  </label>
               </div>
               
               {azureOCR.enabled && (
                 <div className="space-y-4 animate-in slide-in-from-top-2">
                    <input 
                      type="text" 
                      value={azureOCR.endpoint}
                      onChange={e => setAzureOCR({...azureOCR, endpoint: e.target.value})}
                      placeholder="Azure Endpoint URL"
                      className={`w-full ${themeClasses.input} p-4 rounded-2xl font-black text-xs outline-none focus:ring-2 ring-indigo-500/10`}
                    />
                    <input 
                      type="password" 
                      value={azureOCR.key}
                      onChange={e => setAzureOCR({...azureOCR, key: e.target.value})}
                      placeholder="Azure Vision API Key"
                      className={`w-full ${themeClasses.input} p-4 rounded-2xl font-black text-xs outline-none focus:ring-2 ring-indigo-500/10`}
                    />
                 </div>
               )}
               {!azureOCR.enabled && <p className="text-[10px] font-bold opacity-30 px-1 leading-relaxed">Turn this on if you need heavy-duty document scanning beyond what the standard AI can handle.</p>}
            </section>

            <button 
              onClick={() => {
                saveToon('kabalikat_emails.toon', emailAccounts);
                saveToon('kabalikat_ai_keys.toon', aiKeys);
                saveToon('kabalikat_azure_ocr.toon', azureOCR);
                setIsVaultSaved(true);
                setTimeout(() => setIsVaultSaved(false), 2000);
              }}
              className={`w-full py-6 font-black rounded-[2.5rem] shadow-2xl active:scale-95 transition-all text-xs tracking-widest uppercase ${isVaultSaved ? 'bg-emerald-500 text-white' : 'bg-indigo-600 text-white'}`}
            >
               {isVaultSaved ? 'Vault Securely Saved' : 'Save Local Vault'}
            </button>
          </div>
        )}

        {mode === AppMode.GUIDE && (
           <SetupGuide onBack={() => setMode(AppMode.SETTINGS)} isDark={resolvedTheme === 'dark'} />
        )}
      </main>

      {/* Navigation */}
      <nav className={`h-22 ${themeClasses.nav} flex items-center justify-around px-2 relative z-20 shadow-[0_-10px_30px_rgba(0,0,0,0.1)] transition-colors`}>
        {[
          { mode: AppMode.DASHBOARD, icon: LayoutDashboard, label: 'Board' },
          { mode: AppMode.SENTRY, icon: ShieldCheck, label: 'Feed' },
          { mode: AppMode.COMPANION, icon: MessageSquare, label: 'Ally' },
          { mode: AppMode.CALENDAR, icon: CalendarIcon, label: 'Plan' },
          { mode: AppMode.SETTINGS, icon: SettingsIcon, label: 'Vault' }
        ].map((item) => (
          <button 
            key={item.mode}
            onClick={() => setMode(item.mode)} 
            className={`flex flex-col items-center gap-1.5 transition-all flex-1 py-3 ${mode === item.mode ? 'text-indigo-600' : themeClasses.muted}`}
          >
            <div className={`p-2 rounded-[1rem] transition-all ${mode === item.mode ? 'bg-indigo-600/10 scale-110' : 'opacity-60'}`}>
               <item.icon className="w-5 h-5" />
            </div>
            <span className="text-[8px] font-black uppercase tracking-widest">{item.label}</span>
          </button>
        ))}
      </nav>

      {/* Loading Overlay */}
      {isProcessing && mode !== AppMode.COMPANION && (
        <div className="absolute inset-0 bg-black/20 backdrop-blur-[6px] z-[70] flex items-center justify-center pointer-events-none">
          <div className={`${resolvedTheme === 'dark' ? 'bg-slate-900' : 'bg-white'} p-8 rounded-[3.5rem] shadow-2xl flex flex-col items-center gap-4 animate-in zoom-in-95`}>
             <Loader2 className="w-10 h-10 text-indigo-500 animate-spin" />
             <div className="text-center">
               <span className="text-[11px] font-black uppercase tracking-[0.3em] text-indigo-500 block">Synchronizing</span>
             </div>
          </div>
        </div>
      )}
    </div>
  );
}
