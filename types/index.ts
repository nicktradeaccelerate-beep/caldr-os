export type UserRole = 'owner' | 'manager' | 'va';
export type PlanId = 'starter' | 'professional' | 'intelligence' | 'os';
export type CallDirection = 'inbound' | 'outbound';
export type CallStatus = 'active' | 'completed' | 'missed';
export type TaskStatus = 'pending' | 'active' | 'done';
export type TaskCategory = 'calls' | 'admin' | 'training' | 'planning';
export type BossUpdateType = 'task_start' | 'task_complete' | 'working' | 'daily_summary';
export type SupervisorMode = 'listen' | 'whisper' | 'barge';

export interface Business {
  id: string;
  name: string;
  short_name: string;
  accent_color: string;
  logo_url: string | null;
  knowledge: string | null;
  objections: Record<string, string>;
  plan: PlanId;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  notifyWhatsApp?: boolean;
  notifyEmail?: boolean;
  whatsappNumber?: string;
  ownerWhatsApp?: string;
  ownerEmail?: string;
  crm_integration: 'none' | 'supabase_shared';
  created_at: string;
}

export interface User {
  id: string;
  business_id: string;
  name: string;
  email: string;
  role: UserRole;
  uk_number: string | null;
  twilio_sip_username: string | null;
  twilio_sip_password: string | null;
  port_status: 'new' | 'pending' | 'ported';
  pac_code: string | null;
  status: 'online' | 'on-call' | 'offline';
  hearts_total: number;
  level: number;
  streak: number;
  ai_usage: { claude: number; gpt: number; gemini: number };
  created_at: string;
}

export interface CaldrNumber {
  id: string;
  business_id: string;
  user_id: string;
  number: string;
  twilio_sid: string;
  type: 'mobile' | 'landline';
  features: { recording: boolean; transcription: boolean; voicemail: boolean };
  whatsapp_verified: boolean;
  status: 'active' | 'suspended';
  created_at: string;
}

export interface Call {
  id: string;
  business_id: string;
  va_id: string;
  twilio_call_sid: string | null;
  contact_name: string | null;
  contact_number: string;
  direction: CallDirection;
  area: string | null;
  duration_seconds: number;
  sentiment_score: number | null;
  intent_signal: string | null;
  ai_score: number | null;
  flags: string[];
  recording_url: string | null;
  transcript: string | null;
  coaching_note: string | null;
  outcome: string | null;
  channel: 'phone' | 'whatsapp';
  status: CallStatus;
  started_at: string;
  ended_at: string | null;
}

export interface Task {
  id: string;
  business_id: string;
  user_id: string;
  text: string;
  category: TaskCategory;
  hearts: 1 | 2 | 3;
  estimate_mins: number;
  elapsed_seconds: number;
  status: TaskStatus;
  due_date: string;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
}

export interface BossUpdate {
  id: string;
  business_id: string;
  va_id: string;
  type: BossUpdateType;
  message: string;
  task_id: string | null;
  call_id: string | null;
  sent_whatsapp: boolean;
  sent_email: boolean;
  created_at: string;
}

export interface WhatsAppMessage {
  id: string;
  business_id: string;
  va_id: string | null;
  contact_number: string;
  contact_name: string | null;
  message: string;
  direction: 'inbound' | 'outbound';
  lead_score: number | null;
  ai_response: string | null;
  status: 'unread' | 'read' | 'scored' | 'replied';
  bfb_pipeline_added: boolean;
  created_at: string;
}

export interface DayStats {
  callsYesterday: number;
  avgSentiment: number;
  tasksToday: number;
  weakArea: string;
}

export interface IncomingCall {
  contactName: string | null;
  area: string | null;
  number: string;
  leadId?: string | null;       // BFB lead ID if found via CRM lookup
}

export interface CallHistory {
  summary: string;
  date: string;
}

export interface ActiveCall {
  vaName: string;
  contactName: string | null;
  area: string | null;
  durationMins: number;
  sentiment: number;
  intent: string | null;
  callSid: string;
}

export interface CompletedCall {
  contactName: string | null;
  durationMins: number;
  sentiment: number;
  flags: string[];
  leadId?: string | null;       // BFB lead ID for write-back
  contactNotes?: string | null; // Pre-existing CRM notes to show context
}

export interface Job {
  address: string;
  type: string;
  value: string;
}

export interface ClippyContext {
  currentTask: string | null;
  aiUsage: { claude: number; gpt: number; gemini: number };
}

export interface BossUpdatePayload {
  vaId: string;
  vaName: string;
  taskId?: string;
  taskText?: string;
  callId?: string;
  duration?: string;
  hearts?: string;
}

export interface RankedConnection {
  name: string;
  company: string;
  position: string;
  score: number;
  reason: string;
  dm: string;
}
