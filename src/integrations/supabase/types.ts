export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      ai_settings: {
        Row: {
          auto_reply_all_messages: boolean
          auto_reply_first_message: boolean
          created_at: string
          enabled: boolean
          guild_id: string
          id: string
          knowledge_base: string
          model: string
          system_prompt: string
          updated_at: string
        }
        Insert: {
          auto_reply_all_messages?: boolean
          auto_reply_first_message?: boolean
          created_at?: string
          enabled?: boolean
          guild_id: string
          id?: string
          knowledge_base?: string
          model?: string
          system_prompt?: string
          updated_at?: string
        }
        Update: {
          auto_reply_all_messages?: boolean
          auto_reply_first_message?: boolean
          created_at?: string
          enabled?: boolean
          guild_id?: string
          id?: string
          knowledge_base?: string
          model?: string
          system_prompt?: string
          updated_at?: string
        }
        Relationships: []
      }
      automations: {
        Row: {
          action_type: string
          action_value: string
          created_at: string
          enabled: boolean
          guild_id: string
          id: string
          name: string
          priority: number
          run_count: number
          trigger_type: string
          trigger_value: string
          updated_at: string
        }
        Insert: {
          action_type?: string
          action_value?: string
          created_at?: string
          enabled?: boolean
          guild_id: string
          id?: string
          name?: string
          priority?: number
          run_count?: number
          trigger_type?: string
          trigger_value?: string
          updated_at?: string
        }
        Update: {
          action_type?: string
          action_value?: string
          created_at?: string
          enabled?: boolean
          guild_id?: string
          id?: string
          name?: string
          priority?: number
          run_count?: number
          trigger_type?: string
          trigger_value?: string
          updated_at?: string
        }
        Relationships: []
      }
      guilds: {
        Row: {
          created_at: string
          guild_id: string
          id: string
          log_channel_id: string | null
          name: string
          panel_channel_id: string | null
          staff_role_id: string | null
          ticket_category_id: string | null
          updated_at: string
          welcome_message: string
        }
        Insert: {
          created_at?: string
          guild_id: string
          id?: string
          log_channel_id?: string | null
          name?: string
          panel_channel_id?: string | null
          staff_role_id?: string | null
          ticket_category_id?: string | null
          updated_at?: string
          welcome_message?: string
        }
        Update: {
          created_at?: string
          guild_id?: string
          id?: string
          log_channel_id?: string | null
          name?: string
          panel_channel_id?: string | null
          staff_role_id?: string | null
          ticket_category_id?: string | null
          updated_at?: string
          welcome_message?: string
        }
        Relationships: []
      }
      ticket_messages: {
        Row: {
          author_id: string | null
          author_name: string
          content: string
          created_at: string
          id: string
          source: string
          ticket_id: string
        }
        Insert: {
          author_id?: string | null
          author_name?: string
          content?: string
          created_at?: string
          id?: string
          source?: string
          ticket_id: string
        }
        Update: {
          author_id?: string | null
          author_name?: string
          content?: string
          created_at?: string
          id?: string
          source?: string
          ticket_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ticket_messages_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      tickets: {
        Row: {
          ai_handled: boolean
          category: string
          channel_id: string | null
          closed_at: string | null
          created_at: string
          discord_user_id: string
          discord_username: string
          guild_id: string
          id: string
          priority: string
          status: string
          subject: string
          ticket_number: number
          updated_at: string
        }
        Insert: {
          ai_handled?: boolean
          category?: string
          channel_id?: string | null
          closed_at?: string | null
          created_at?: string
          discord_user_id: string
          discord_username?: string
          guild_id: string
          id?: string
          priority?: string
          status?: string
          subject?: string
          ticket_number?: number
          updated_at?: string
        }
        Update: {
          ai_handled?: boolean
          category?: string
          channel_id?: string | null
          closed_at?: string | null
          created_at?: string
          discord_user_id?: string
          discord_username?: string
          guild_id?: string
          id?: string
          priority?: string
          status?: string
          subject?: string
          ticket_number?: number
          updated_at?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      claim_first_admin: { Args: never; Returns: boolean }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin"],
    },
  },
} as const
