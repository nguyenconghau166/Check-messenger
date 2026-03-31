export interface Profile {
  id: string;
  name: string;
  is_admin: boolean;
  language: string;
  created_at: string;
  updated_at: string;
}

export interface Channel {
  id: string;
  user_id: string;
  channel_type: "zalo_oa" | "facebook";
  name: string;
  external_id: string;
  is_active: boolean;
  last_sync_at: string | null;
  last_sync_status: string | null;
  last_sync_error: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface Conversation {
  id: string;
  user_id: string;
  channel_id: string;
  external_conversation_id: string;
  external_user_id: string;
  customer_name: string;
  last_message_at: string | null;
  message_count: number;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  channel?: Channel;
}

export interface Message {
  id: string;
  user_id: string;
  conversation_id: string;
  external_message_id: string;
  sender_type: "customer" | "agent" | "system";
  sender_name: string;
  sender_external_id: string;
  content: string;
  content_type: string;
  attachments: unknown[];
  sent_at: string;
  raw_data: Record<string, unknown>;
  created_at: string;
}

export interface Job {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  job_type: string;
  input_channel_ids: string[];
  rules_content: string | null;
  rules_config: Record<string, unknown>;
  skip_conditions: Record<string, unknown>;
  ai_provider: string;
  ai_model: string;
  is_active: boolean;
  last_run_at: string | null;
  last_run_status: string | null;
  created_at: string;
  updated_at: string;
}

export interface JobRun {
  id: string;
  job_id: string;
  user_id: string;
  started_at: string;
  finished_at: string | null;
  status: "running" | "success" | "error";
  summary: Record<string, unknown>;
  error_message: string | null;
  created_at: string;
}

export interface JobResult {
  id: string;
  job_run_id: string;
  user_id: string;
  conversation_id: string | null;
  result_type: string;
  severity: string | null;
  rule_name: string | null;
  evidence: string | null;
  detail: Record<string, unknown>;
  ai_raw_response: string | null;
  confidence: number | null;
  created_at: string;
  conversation?: Conversation;
}

export interface AppSetting {
  id: string;
  user_id: string;
  setting_key: string;
  value_encrypted: string | null;
  value_plain: string | null;
}

export interface ActivityLog {
  id: string;
  user_id: string;
  action: string;
  resource_type: string | null;
  resource_id: string | null;
  detail: Record<string, unknown>;
  error_message: string | null;
  created_at: string;
}

export interface AiUsageLog {
  id: string;
  user_id: string;
  job_id: string | null;
  job_run_id: string | null;
  provider: string;
  model: string;
  input_tokens: number;
  output_tokens: number;
  cost_usd: number;
  created_at: string;
}

export interface DashboardStats {
  total_conversations: number;
  total_channels: number;
  total_jobs: number;
  total_runs: number;
  pass_rate: number;
  total_cost: number;
  recent_results: JobResult[];
  daily_stats: { date: string; count: number; passed: number; failed: number }[];
}
