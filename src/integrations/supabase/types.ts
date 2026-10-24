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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      budget_history: {
        Row: {
          action: string
          budget_id: string
          changed_at: string
          changed_by: string | null
          id: string
          summary: Json | null
        }
        Insert: {
          action: string
          budget_id: string
          changed_at?: string
          changed_by?: string | null
          id?: string
          summary?: Json | null
        }
        Update: {
          action?: string
          budget_id?: string
          changed_at?: string
          changed_by?: string | null
          id?: string
          summary?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "budget_history_budget_id_fkey"
            columns: ["budget_id"]
            isOneToOne: false
            referencedRelation: "budgets"
            referencedColumns: ["id"]
          },
        ]
      }
      budget_items: {
        Row: {
          budget_id: string
          created_at: string
          created_by: string | null
          description: string
          id: string
          item_discount: number
          labor_cost_unit: number
          labor_markup_override: number | null
          materials: Json
          materials_markup_override: number | null
          quantity: number
          section_id: string
          service_id: string | null
          sort: number
          unit: Database["public"]["Enums"]["service_unit"]
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          budget_id: string
          created_at?: string
          created_by?: string | null
          description: string
          id?: string
          item_discount?: number
          labor_cost_unit?: number
          labor_markup_override?: number | null
          materials?: Json
          materials_markup_override?: number | null
          quantity?: number
          section_id: string
          service_id?: string | null
          sort?: number
          unit?: Database["public"]["Enums"]["service_unit"]
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          budget_id?: string
          created_at?: string
          created_by?: string | null
          description?: string
          id?: string
          item_discount?: number
          labor_cost_unit?: number
          labor_markup_override?: number | null
          materials?: Json
          materials_markup_override?: number | null
          quantity?: number
          section_id?: string
          service_id?: string | null
          sort?: number
          unit?: Database["public"]["Enums"]["service_unit"]
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "budget_items_budget_id_fkey"
            columns: ["budget_id"]
            isOneToOne: false
            referencedRelation: "budgets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "budget_items_section_id_fkey"
            columns: ["section_id"]
            isOneToOne: false
            referencedRelation: "budget_sections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "budget_items_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      budget_sections: {
        Row: {
          budget_id: string
          created_at: string
          created_by: string | null
          id: string
          materials_text: string | null
          sort: number
          stage_id: string | null
          title: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          budget_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          materials_text?: string | null
          sort?: number
          stage_id?: string | null
          title: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          budget_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          materials_text?: string | null
          sort?: number
          stage_id?: string | null
          title?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "budget_sections_budget_id_fkey"
            columns: ["budget_id"]
            isOneToOne: false
            referencedRelation: "budgets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "budget_sections_stage_id_fkey"
            columns: ["stage_id"]
            isOneToOne: false
            referencedRelation: "stages"
            referencedColumns: ["id"]
          },
        ]
      }
      budgets: {
        Row: {
          architect_id: string | null
          archived: boolean
          bairro: string | null
          cep: string | null
          cidade: string | null
          client_display: string | null
          client_id: string | null
          closing_text: string | null
          created_at: string
          created_by: string | null
          endereco: string | null
          estimated_term: string | null
          exclusions: string | null
          general_discount: number
          id: string
          issue_date: string
          notes: string | null
          number: number
          params: Json
          parent_budget_id: string | null
          payment_terms: Json
          revision: number
          status: Database["public"]["Enums"]["budget_status"]
          title: string
          uf: string | null
          updated_at: string
          updated_by: string | null
          validity_date: string | null
        }
        Insert: {
          architect_id?: string | null
          archived?: boolean
          bairro?: string | null
          cep?: string | null
          cidade?: string | null
          client_display?: string | null
          client_id?: string | null
          closing_text?: string | null
          created_at?: string
          created_by?: string | null
          endereco?: string | null
          estimated_term?: string | null
          exclusions?: string | null
          general_discount?: number
          id?: string
          issue_date?: string
          notes?: string | null
          number?: number
          params?: Json
          parent_budget_id?: string | null
          payment_terms?: Json
          revision?: number
          status?: Database["public"]["Enums"]["budget_status"]
          title?: string
          uf?: string | null
          updated_at?: string
          updated_by?: string | null
          validity_date?: string | null
        }
        Update: {
          architect_id?: string | null
          archived?: boolean
          bairro?: string | null
          cep?: string | null
          cidade?: string | null
          client_display?: string | null
          client_id?: string | null
          closing_text?: string | null
          created_at?: string
          created_by?: string | null
          endereco?: string | null
          estimated_term?: string | null
          exclusions?: string | null
          general_discount?: number
          id?: string
          issue_date?: string
          notes?: string | null
          number?: number
          params?: Json
          parent_budget_id?: string | null
          payment_terms?: Json
          revision?: number
          status?: Database["public"]["Enums"]["budget_status"]
          title?: string
          uf?: string | null
          updated_at?: string
          updated_by?: string | null
          validity_date?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "budgets_architect_id_fkey"
            columns: ["architect_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "budgets_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "budgets_parent_budget_id_fkey"
            columns: ["parent_budget_id"]
            isOneToOne: false
            referencedRelation: "budgets"
            referencedColumns: ["id"]
          },
        ]
      }
      catalog_history: {
        Row: {
          after: Json | null
          before: Json | null
          changed_at: string
          changed_by: string | null
          entity: string
          entity_id: string
          id: string
        }
        Insert: {
          after?: Json | null
          before?: Json | null
          changed_at?: string
          changed_by?: string | null
          entity: string
          entity_id: string
          id?: string
        }
        Update: {
          after?: Json | null
          before?: Json | null
          changed_at?: string
          changed_by?: string | null
          entity?: string
          entity_id?: string
          id?: string
        }
        Relationships: []
      }
      company_settings: {
        Row: {
          agencia: string | null
          bairro: string | null
          banco: string | null
          cep: string | null
          cidade: string | null
          cnpj: string | null
          condicoes_padrao: string | null
          conta: string | null
          created_at: string
          created_by: string | null
          email: string | null
          endereco: string | null
          id: number
          instagram: string | null
          nome_fantasia: string | null
          pix: string | null
          razao_social: string | null
          responsavel: string | null
          sobre: string | null
          telefone: string | null
          texto_fechamento: string | null
          uf: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          agencia?: string | null
          bairro?: string | null
          banco?: string | null
          cep?: string | null
          cidade?: string | null
          cnpj?: string | null
          condicoes_padrao?: string | null
          conta?: string | null
          created_at?: string
          created_by?: string | null
          email?: string | null
          endereco?: string | null
          id?: number
          instagram?: string | null
          nome_fantasia?: string | null
          pix?: string | null
          razao_social?: string | null
          responsavel?: string | null
          sobre?: string | null
          telefone?: string | null
          texto_fechamento?: string | null
          uf?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          agencia?: string | null
          bairro?: string | null
          banco?: string | null
          cep?: string | null
          cidade?: string | null
          cnpj?: string | null
          condicoes_padrao?: string | null
          conta?: string | null
          created_at?: string
          created_by?: string | null
          email?: string | null
          endereco?: string | null
          id?: number
          instagram?: string | null
          nome_fantasia?: string | null
          pix?: string | null
          razao_social?: string | null
          responsavel?: string | null
          sobre?: string | null
          telefone?: string | null
          texto_fechamento?: string | null
          uf?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      cost_categories: {
        Row: {
          active: boolean
          created_at: string
          created_by: string | null
          id: string
          name: string
          sort: number
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          active?: boolean
          created_at?: string
          created_by?: string | null
          id?: string
          name: string
          sort?: number
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          active?: boolean
          created_at?: string
          created_by?: string | null
          id?: string
          name?: string
          sort?: number
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      materials: {
        Row: {
          active: boolean
          consumption_unit: string
          conversion: number
          created_at: string
          created_by: string | null
          id: string
          name: string
          price: number
          price_updated_at: string
          purchase_unit: string
          supplier_id: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          active?: boolean
          consumption_unit: string
          conversion?: number
          created_at?: string
          created_by?: string | null
          id?: string
          name: string
          price?: number
          price_updated_at?: string
          purchase_unit: string
          supplier_id?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          active?: boolean
          consumption_unit?: string
          conversion?: number
          created_at?: string
          created_by?: string | null
          id?: string
          name?: string
          price?: number
          price_updated_at?: string
          purchase_unit?: string
          supplier_id?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "materials_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
        ]
      }
      people: {
        Row: {
          active: boolean
          bairro: string | null
          cep: string | null
          cidade: string | null
          created_at: string
          created_by: string | null
          document: string | null
          email: string | null
          endereco: string | null
          id: string
          kind: Database["public"]["Enums"]["person_kind"]
          name: string
          notes: string | null
          phone: string | null
          rg: string | null
          specialty: string | null
          uf: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          active?: boolean
          bairro?: string | null
          cep?: string | null
          cidade?: string | null
          created_at?: string
          created_by?: string | null
          document?: string | null
          email?: string | null
          endereco?: string | null
          id?: string
          kind: Database["public"]["Enums"]["person_kind"]
          name: string
          notes?: string | null
          phone?: string | null
          rg?: string | null
          specialty?: string | null
          uf?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          active?: boolean
          bairro?: string | null
          cep?: string | null
          cidade?: string | null
          created_at?: string
          created_by?: string | null
          document?: string | null
          email?: string | null
          endereco?: string | null
          id?: string
          kind?: Database["public"]["Enums"]["person_kind"]
          name?: string
          notes?: string | null
          phone?: string | null
          rg?: string | null
          specialty?: string | null
          uf?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      pricing_settings: {
        Row: {
          architect_commission: number
          configured: boolean
          created_at: string
          created_by: string | null
          desired_margin: number
          id: number
          labor_markup: number
          materials_markup: number
          min_margin: number
          negotiation_reserve: number
          reinvestment_share: number
          taxes: Json
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          architect_commission?: number
          configured?: boolean
          created_at?: string
          created_by?: string | null
          desired_margin?: number
          id?: number
          labor_markup?: number
          materials_markup?: number
          min_margin?: number
          negotiation_reserve?: number
          reinvestment_share?: number
          taxes?: Json
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          architect_commission?: number
          configured?: boolean
          created_at?: string
          created_by?: string | null
          desired_margin?: number
          id?: number
          labor_markup?: number
          materials_markup?: number
          min_margin?: number
          negotiation_reserve?: number
          reinvestment_share?: number
          taxes?: Json
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          email: string | null
          full_name: string | null
          id: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
        }
        Update: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
        }
        Relationships: []
      }
      service_materials: {
        Row: {
          consumption: number
          created_at: string
          created_by: string | null
          id: string
          loss_pct: number
          material_id: string
          service_id: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          consumption?: number
          created_at?: string
          created_by?: string | null
          id?: string
          loss_pct?: number
          material_id: string
          service_id: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          consumption?: number
          created_at?: string
          created_by?: string | null
          id?: string
          loss_pct?: number
          material_id?: string
          service_id?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "service_materials_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "materials"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_materials_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      services: {
        Row: {
          active: boolean
          created_at: string
          created_by: string | null
          description: string
          id: string
          labor_cost: number
          stage_id: string | null
          unit: Database["public"]["Enums"]["service_unit"]
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          active?: boolean
          created_at?: string
          created_by?: string | null
          description: string
          id?: string
          labor_cost?: number
          stage_id?: string | null
          unit?: Database["public"]["Enums"]["service_unit"]
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          active?: boolean
          created_at?: string
          created_by?: string | null
          description?: string
          id?: string
          labor_cost?: number
          stage_id?: string | null
          unit?: Database["public"]["Enums"]["service_unit"]
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "services_stage_id_fkey"
            columns: ["stage_id"]
            isOneToOne: false
            referencedRelation: "stages"
            referencedColumns: ["id"]
          },
        ]
      }
      stages: {
        Row: {
          active: boolean
          created_at: string
          created_by: string | null
          id: string
          name: string
          sort: number
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          active?: boolean
          created_at?: string
          created_by?: string | null
          id?: string
          name: string
          sort?: number
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          active?: boolean
          created_at?: string
          created_by?: string | null
          id?: string
          name?: string
          sort?: number
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
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
      can_see_costs: { Args: { _user_id: string }; Returns: boolean }
      copy_budget: {
        Args: { _as_revision: boolean; _budget_id: string }
        Returns: string
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "financeiro" | "equipe"
      budget_status:
        | "elaboracao"
        | "enviado"
        | "aprovado"
        | "recusado"
        | "cancelado"
      person_kind:
        | "cliente"
        | "contato"
        | "arquiteto"
        | "fornecedor"
        | "prestador"
      service_unit: "m2" | "ml" | "un" | "diaria" | "vb"
      supplier_side: "jmg" | "cliente"
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
      app_role: ["admin", "financeiro", "equipe"],
      budget_status: [
        "elaboracao",
        "enviado",
        "aprovado",
        "recusado",
        "cancelado",
      ],
      person_kind: [
        "cliente",
        "contato",
        "arquiteto",
        "fornecedor",
        "prestador",
      ],
      service_unit: ["m2", "ml", "un", "diaria", "vb"],
      supplier_side: ["jmg", "cliente"],
    },
  },
} as const
