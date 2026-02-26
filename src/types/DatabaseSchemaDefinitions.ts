export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export interface Database {
  public: {
    Tables: {
      orgs: {
        Row: { id: string; name: string; created_at: string }
        Insert: { id?: string; name: string; created_at?: string }
        Update: { id?: string; name?: string; created_at?: string }
        Relationships: []
      }
      profiles: {
        Row: {
          id: string
          org_id: string | null
          email: string
          full_name: string | null
          role: 'admin' | 'analyst'
          created_at: string
        }
        Insert: {
          id: string
          org_id?: string | null
          email: string
          full_name?: string | null
          role?: 'admin' | 'analyst'
          created_at?: string
        }
        Update: {
          id?: string
          org_id?: string | null
          email?: string
          full_name?: string | null
          role?: 'admin' | 'analyst'
          created_at?: string
        }
        Relationships: []
      }
      projects: {
        Row: {
          id: string
          org_id: string | null
          created_by: string
          client_name: string
          industry: string | null
          goal: string | null
          stage: string | null
          channels: string[] | null
          target_audience: string | null
          status: 'draft' | 'active' | 'completed' | 'archived'
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          org_id?: string | null
          created_by: string
          client_name: string
          industry?: string | null
          goal?: string | null
          stage?: string | null
          channels?: string[] | null
          target_audience?: string | null
          status?: 'draft' | 'active' | 'completed' | 'archived'
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          org_id?: string | null
          created_by?: string
          client_name?: string
          industry?: string | null
          goal?: string | null
          stage?: string | null
          channels?: string[] | null
          target_audience?: string | null
          status?: 'draft' | 'active' | 'completed' | 'archived'
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      framework_packs: {
        Row: {
          id: string
          name: string
          version: string
          description: string | null
          active: boolean
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          version: string
          description?: string | null
          active?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          version?: string
          description?: string | null
          active?: boolean
          created_at?: string
        }
        Relationships: []
      }
      framework_categories: {
        Row: {
          id: string
          pack_id: string
          name: string
          weight: number
          order_index: number
          created_at: string
        }
        Insert: {
          id?: string
          pack_id: string
          name: string
          weight: number
          order_index?: number
          created_at?: string
        }
        Update: {
          id?: string
          pack_id?: string
          name?: string
          weight?: number
          order_index?: number
          created_at?: string
        }
        Relationships: []
      }
      framework_questions: {
        Row: {
          id: string
          pack_id: string
          category_id: string
          type: 'single_select' | 'multi_select' | 'scale' | 'text'
          prompt: string
          required: boolean
          order_index: number
          created_at: string
        }
        Insert: {
          id?: string
          pack_id: string
          category_id: string
          type: 'single_select' | 'multi_select' | 'scale' | 'text'
          prompt: string
          required?: boolean
          order_index?: number
          created_at?: string
        }
        Update: {
          id?: string
          pack_id?: string
          category_id?: string
          type?: 'single_select' | 'multi_select' | 'scale' | 'text'
          prompt?: string
          required?: boolean
          order_index?: number
          created_at?: string
        }
        Relationships: []
      }
      framework_options: {
        Row: {
          id: string
          question_id: string
          label: string
          value_key: string
          order_index: number
          created_at: string
        }
        Insert: {
          id?: string
          question_id: string
          label: string
          value_key: string
          order_index?: number
          created_at?: string
        }
        Update: {
          id?: string
          question_id?: string
          label?: string
          value_key?: string
          order_index?: number
          created_at?: string
        }
        Relationships: []
      }
      framework_scoring_rules: {
        Row: {
          id: string
          question_id: string
          option_value_key: string
          score_delta: number
          risk_flag: boolean
          friction_flag: boolean
          driver_tag: string | null
          created_at: string
        }
        Insert: {
          id?: string
          question_id: string
          option_value_key: string
          score_delta: number
          risk_flag?: boolean
          friction_flag?: boolean
          driver_tag?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          question_id?: string
          option_value_key?: string
          score_delta?: number
          risk_flag?: boolean
          friction_flag?: boolean
          driver_tag?: string | null
          created_at?: string
        }
        Relationships: []
      }
      surveys: {
        Row: {
          id: string
          project_id: string
          pack_id: string
          pack_version_snapshot: Json
          status: 'draft' | 'published' | 'closed'
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          project_id: string
          pack_id: string
          pack_version_snapshot: Json
          status?: 'draft' | 'published' | 'closed'
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          project_id?: string
          pack_id?: string
          pack_version_snapshot?: Json
          status?: 'draft' | 'published' | 'closed'
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      survey_tokens: {
        Row: {
          id: string
          survey_id: string
          token: string
          expires_at: string | null
          max_responses: number | null
          response_count: number
          created_at: string
        }
        Insert: {
          id?: string
          survey_id: string
          token: string
          expires_at?: string | null
          max_responses?: number | null
          response_count?: number
          created_at?: string
        }
        Update: {
          id?: string
          survey_id?: string
          token?: string
          expires_at?: string | null
          max_responses?: number | null
          response_count?: number
          created_at?: string
        }
        Relationships: []
      }
      responses: {
        Row: {
          id: string
          survey_id: string
          token_id: string | null
          respondent_meta: Json | null
          submitted_at: string
        }
        Insert: {
          id?: string
          survey_id: string
          token_id?: string | null
          respondent_meta?: Json | null
          submitted_at?: string
        }
        Update: {
          id?: string
          survey_id?: string
          token_id?: string | null
          respondent_meta?: Json | null
          submitted_at?: string
        }
        Relationships: []
      }
      response_answers: {
        Row: {
          id: string
          response_id: string
          question_id: string
          option_value_key: string | null
          free_text: string | null
          created_at: string
        }
        Insert: {
          id?: string
          response_id: string
          question_id: string
          option_value_key?: string | null
          free_text?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          response_id?: string
          question_id?: string
          option_value_key?: string | null
          free_text?: string | null
          created_at?: string
        }
        Relationships: []
      }
      score_runs: {
        Row: {
          id: string
          survey_id: string
          framework_version: string
          executed_at: string
          checksum: string
          response_count: number
        }
        Insert: {
          id?: string
          survey_id: string
          framework_version: string
          executed_at?: string
          checksum: string
          response_count: number
        }
        Update: {
          id?: string
          survey_id?: string
          framework_version?: string
          executed_at?: string
          checksum?: string
          response_count?: number
        }
        Relationships: []
      }
      score_results: {
        Row: {
          id: string
          score_run_id: string
          category_id: string
          raw_score: number
          min_possible: number
          max_possible: number
          normalized_score: number
          created_at: string
        }
        Insert: {
          id?: string
          score_run_id: string
          category_id: string
          raw_score: number
          min_possible: number
          max_possible: number
          normalized_score: number
          created_at?: string
        }
        Update: {
          id?: string
          score_run_id?: string
          category_id?: string
          raw_score?: number
          min_possible?: number
          max_possible?: number
          normalized_score?: number
          created_at?: string
        }
        Relationships: []
      }
      index_results: {
        Row: {
          id: string
          score_run_id: string
          index_key: string
          score_0_100: number
          higher_is_better: boolean
          created_at: string
        }
        Insert: {
          id?: string
          score_run_id: string
          index_key: string
          score_0_100: number
          higher_is_better?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          score_run_id?: string
          index_key?: string
          score_0_100?: number
          higher_is_better?: boolean
          created_at?: string
        }
        Relationships: []
      }
      executive_results: {
        Row: {
          id: string
          score_run_id: string
          health_score_0_100: number
          created_at: string
        }
        Insert: {
          id?: string
          score_run_id: string
          health_score_0_100: number
          created_at?: string
        }
        Update: {
          id?: string
          score_run_id?: string
          health_score_0_100?: number
          created_at?: string
        }
        Relationships: []
      }
      issue_rankings: {
        Row: {
          id: string
          score_run_id: string
          driver_tag: string
          risk: number
          friction: number
          frequency: number
          priority_score: number
          description: string | null
          created_at: string
        }
        Insert: {
          id?: string
          score_run_id: string
          driver_tag: string
          risk: number
          friction: number
          frequency: number
          priority_score: number
          description?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          score_run_id?: string
          driver_tag?: string
          risk?: number
          friction?: number
          frequency?: number
          priority_score?: number
          description?: string | null
          created_at?: string
        }
        Relationships: []
      }
      ai_insights: {
        Row: {
          id: string
          score_run_id: string
          summary_text: string | null
          themes_json: Json | null
          model_metadata: Json | null
          created_at: string
        }
        Insert: {
          id?: string
          score_run_id: string
          summary_text?: string | null
          themes_json?: Json | null
          model_metadata?: Json | null
          created_at?: string
        }
        Update: {
          id?: string
          score_run_id?: string
          summary_text?: string | null
          themes_json?: Json | null
          model_metadata?: Json | null
          created_at?: string
        }
        Relationships: []
      }
      report_shares: {
        Row: {
          id: string
          project_id: string
          score_run_id: string
          token: string
          created_by: string | null
          created_at: string
          expires_at: string | null
          view_count: number
          last_viewed_at: string | null
          is_active: boolean
        }
        Insert: {
          id?: string
          project_id: string
          score_run_id: string
          token: string
          created_by?: string | null
          created_at?: string
          expires_at?: string | null
          view_count?: number
          last_viewed_at?: string | null
          is_active?: boolean
        }
        Update: {
          id?: string
          project_id?: string
          score_run_id?: string
          token?: string
          created_by?: string | null
          created_at?: string
          expires_at?: string | null
          view_count?: number
          last_viewed_at?: string | null
          is_active?: boolean
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      increment_report_view: {
        Args: { share_token: string }
        Returns: undefined
      }
      increment_token_response_count: {
        Args: { token_id: string }
        Returns: undefined
      }
    }
    Enums: {
      [_ in never]: never
    }
  }
}
