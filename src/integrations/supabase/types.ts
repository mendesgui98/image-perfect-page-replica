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
      account_transfers: {
        Row: {
          amount: number
          created_at: string
          created_by: string | null
          description: string | null
          from_account_id: string
          id: string
          to_account_id: string
          transfer_date: string
        }
        Insert: {
          amount: number
          created_at?: string
          created_by?: string | null
          description?: string | null
          from_account_id: string
          id?: string
          to_account_id: string
          transfer_date: string
        }
        Update: {
          amount?: number
          created_at?: string
          created_by?: string | null
          description?: string | null
          from_account_id?: string
          id?: string
          to_account_id?: string
          transfer_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "account_transfers_from_account_id_fkey"
            columns: ["from_account_id"]
            isOneToOne: false
            referencedRelation: "financial_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "account_transfers_to_account_id_fkey"
            columns: ["to_account_id"]
            isOneToOne: false
            referencedRelation: "financial_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
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
          approval_date: string | null
          approval_path: string | null
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
          approval_date?: string | null
          approval_path?: string | null
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
          approval_date?: string | null
          approval_path?: string | null
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
      contracts: {
        Row: {
          body: string
          created_at: string
          created_by: string | null
          id: string
          signed_date: string | null
          signed_path: string | null
          status: string
          updated_at: string
          updated_by: string | null
          work_id: string
        }
        Insert: {
          body?: string
          created_at?: string
          created_by?: string | null
          id?: string
          signed_date?: string | null
          signed_path?: string | null
          status?: string
          updated_at?: string
          updated_by?: string | null
          work_id: string
        }
        Update: {
          body?: string
          created_at?: string
          created_by?: string | null
          id?: string
          signed_date?: string | null
          signed_path?: string | null
          status?: string
          updated_at?: string
          updated_by?: string | null
          work_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "contracts_work_id_fkey"
            columns: ["work_id"]
            isOneToOne: true
            referencedRelation: "works"
            referencedColumns: ["id"]
          },
        ]
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
      expense_allocations: {
        Row: {
          amount: number
          entry_id: string
          id: string
          rule: string
          work_id: string
        }
        Insert: {
          amount: number
          entry_id: string
          id?: string
          rule: string
          work_id: string
        }
        Update: {
          amount?: number
          entry_id?: string
          id?: string
          rule?: string
          work_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "expense_allocations_entry_id_fkey"
            columns: ["entry_id"]
            isOneToOne: false
            referencedRelation: "financial_entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expense_allocations_work_id_fkey"
            columns: ["work_id"]
            isOneToOne: false
            referencedRelation: "works"
            referencedColumns: ["id"]
          },
        ]
      }
      financial_accounts: {
        Row: {
          active: boolean
          created_at: string
          id: string
          name: string
          opening_balance: number
        }
        Insert: {
          active?: boolean
          created_at?: string
          id?: string
          name: string
          opening_balance?: number
        }
        Update: {
          active?: boolean
          created_at?: string
          id?: string
          name?: string
          opening_balance?: number
        }
        Relationships: []
      }
      financial_entries: {
        Row: {
          amount: number
          canceled: boolean
          category: string
          created_at: string
          created_by: string | null
          description: string
          direction: string
          due_date: string
          id: string
          incurred: boolean
          person_id: string | null
          purchase_order_id: string | null
          stage_id: string | null
          updated_at: string
          updated_by: string | null
          work_id: string | null
        }
        Insert: {
          amount: number
          canceled?: boolean
          category?: string
          created_at?: string
          created_by?: string | null
          description: string
          direction: string
          due_date: string
          id?: string
          incurred?: boolean
          person_id?: string | null
          purchase_order_id?: string | null
          stage_id?: string | null
          updated_at?: string
          updated_by?: string | null
          work_id?: string | null
        }
        Update: {
          amount?: number
          canceled?: boolean
          category?: string
          created_at?: string
          created_by?: string | null
          description?: string
          direction?: string
          due_date?: string
          id?: string
          incurred?: boolean
          person_id?: string | null
          purchase_order_id?: string | null
          stage_id?: string | null
          updated_at?: string
          updated_by?: string | null
          work_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "financial_entries_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_entries_purchase_order_id_fkey"
            columns: ["purchase_order_id"]
            isOneToOne: false
            referencedRelation: "purchase_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_entries_stage_id_fkey"
            columns: ["stage_id"]
            isOneToOne: false
            referencedRelation: "work_stages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_entries_work_id_fkey"
            columns: ["work_id"]
            isOneToOne: false
            referencedRelation: "works"
            referencedColumns: ["id"]
          },
        ]
      }
      financial_settlements: {
        Row: {
          account_id: string
          amount: number
          created_at: string
          created_by: string | null
          entry_id: string
          file_path: string | null
          id: string
          paid_date: string
        }
        Insert: {
          account_id: string
          amount: number
          created_at?: string
          created_by?: string | null
          entry_id: string
          file_path?: string | null
          id?: string
          paid_date: string
        }
        Update: {
          account_id?: string
          amount?: number
          created_at?: string
          created_by?: string | null
          entry_id?: string
          file_path?: string | null
          id?: string
          paid_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "financial_settlements_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "financial_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_settlements_entry_id_fkey"
            columns: ["entry_id"]
            isOneToOne: false
            referencedRelation: "financial_entries"
            referencedColumns: ["id"]
          },
        ]
      }
      material_movements: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          kind: string
          material_key: string
          quantity: number
          record_date: string
          work_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          kind: string
          material_key: string
          quantity: number
          record_date?: string
          work_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          kind?: string
          material_key?: string
          quantity?: number
          record_date?: string
          work_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "material_movements_work_id_fkey"
            columns: ["work_id"]
            isOneToOne: false
            referencedRelation: "works"
            referencedColumns: ["id"]
          },
        ]
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
      purchase_lines: {
        Row: {
          id: string
          material_key: string
          name: string
          order_id: string
          quantity: number
          received: number
          unit: string
          unit_price: number
        }
        Insert: {
          id?: string
          material_key: string
          name: string
          order_id: string
          quantity: number
          received?: number
          unit: string
          unit_price: number
        }
        Update: {
          id?: string
          material_key?: string
          name?: string
          order_id?: string
          quantity?: number
          received?: number
          unit?: string
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "purchase_lines_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "purchase_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      purchase_orders: {
        Row: {
          created_at: string
          created_by: string | null
          description: string
          expected_date: string | null
          file_path: string | null
          id: string
          status: string
          supplier_id: string | null
          updated_at: string
          updated_by: string | null
          work_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description: string
          expected_date?: string | null
          file_path?: string | null
          id?: string
          status?: string
          supplier_id?: string | null
          updated_at?: string
          updated_by?: string | null
          work_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string
          expected_date?: string | null
          file_path?: string | null
          id?: string
          status?: string
          supplier_id?: string | null
          updated_at?: string
          updated_by?: string | null
          work_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "purchase_orders_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_orders_work_id_fkey"
            columns: ["work_id"]
            isOneToOne: false
            referencedRelation: "works"
            referencedColumns: ["id"]
          },
        ]
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
      work_estimates: {
        Row: {
          additional_cost: number
          notes: string | null
          work_id: string
        }
        Insert: {
          additional_cost?: number
          notes?: string | null
          work_id: string
        }
        Update: {
          additional_cost?: number
          notes?: string | null
          work_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "work_estimates_work_id_fkey"
            columns: ["work_id"]
            isOneToOne: true
            referencedRelation: "works"
            referencedColumns: ["id"]
          },
        ]
      }
      work_extras: {
        Row: {
          approval_date: string | null
          approved: boolean
          cost: number
          created_at: string
          created_by: string | null
          description: string
          extra_days: number
          file_path: string | null
          id: string
          price: number
          updated_at: string
          updated_by: string | null
          work_id: string
        }
        Insert: {
          approval_date?: string | null
          approved?: boolean
          cost?: number
          created_at?: string
          created_by?: string | null
          description: string
          extra_days?: number
          file_path?: string | null
          id?: string
          price?: number
          updated_at?: string
          updated_by?: string | null
          work_id: string
        }
        Update: {
          approval_date?: string | null
          approved?: boolean
          cost?: number
          created_at?: string
          created_by?: string | null
          description?: string
          extra_days?: number
          file_path?: string | null
          id?: string
          price?: number
          updated_at?: string
          updated_by?: string | null
          work_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "work_extras_work_id_fkey"
            columns: ["work_id"]
            isOneToOne: false
            referencedRelation: "works"
            referencedColumns: ["id"]
          },
        ]
      }
      work_history: {
        Row: {
          after: Json | null
          before: Json | null
          changed_at: string
          changed_by: string | null
          entity: string
          entity_id: string
          id: string
          work_id: string
        }
        Insert: {
          after?: Json | null
          before?: Json | null
          changed_at?: string
          changed_by?: string | null
          entity: string
          entity_id: string
          id?: string
          work_id: string
        }
        Update: {
          after?: Json | null
          before?: Json | null
          changed_at?: string
          changed_by?: string | null
          entity?: string
          entity_id?: string
          id?: string
          work_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "work_history_work_id_fkey"
            columns: ["work_id"]
            isOneToOne: false
            referencedRelation: "works"
            referencedColumns: ["id"]
          },
        ]
      }
      work_records: {
        Row: {
          body: string | null
          caption: string | null
          created_at: string
          created_by: string | null
          due_date: string | null
          file_path: string | null
          id: string
          kind: string
          next_steps: string | null
          record_date: string
          responsible: string | null
          stage_id: string | null
          status: string
          team: string | null
          title: string
          updated_at: string
          updated_by: string | null
          work_id: string
        }
        Insert: {
          body?: string | null
          caption?: string | null
          created_at?: string
          created_by?: string | null
          due_date?: string | null
          file_path?: string | null
          id?: string
          kind: string
          next_steps?: string | null
          record_date?: string
          responsible?: string | null
          stage_id?: string | null
          status?: string
          team?: string | null
          title: string
          updated_at?: string
          updated_by?: string | null
          work_id: string
        }
        Update: {
          body?: string | null
          caption?: string | null
          created_at?: string
          created_by?: string | null
          due_date?: string | null
          file_path?: string | null
          id?: string
          kind?: string
          next_steps?: string | null
          record_date?: string
          responsible?: string | null
          stage_id?: string | null
          status?: string
          team?: string | null
          title?: string
          updated_at?: string
          updated_by?: string | null
          work_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "work_records_stage_id_fkey"
            columns: ["stage_id"]
            isOneToOne: false
            referencedRelation: "work_stages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_records_work_id_fkey"
            columns: ["work_id"]
            isOneToOne: false
            referencedRelation: "works"
            referencedColumns: ["id"]
          },
        ]
      }
      work_stages: {
        Row: {
          actual_end: string | null
          actual_start: string | null
          budget_section_id: string | null
          created_at: string
          created_by: string | null
          dependency_id: string | null
          id: string
          name: string
          planned_end: string | null
          planned_start: string | null
          progress: number
          responsible: string | null
          sort: number
          updated_at: string
          updated_by: string | null
          weight: number
          work_id: string
        }
        Insert: {
          actual_end?: string | null
          actual_start?: string | null
          budget_section_id?: string | null
          created_at?: string
          created_by?: string | null
          dependency_id?: string | null
          id?: string
          name: string
          planned_end?: string | null
          planned_start?: string | null
          progress?: number
          responsible?: string | null
          sort?: number
          updated_at?: string
          updated_by?: string | null
          weight?: number
          work_id: string
        }
        Update: {
          actual_end?: string | null
          actual_start?: string | null
          budget_section_id?: string | null
          created_at?: string
          created_by?: string | null
          dependency_id?: string | null
          id?: string
          name?: string
          planned_end?: string | null
          planned_start?: string | null
          progress?: number
          responsible?: string | null
          sort?: number
          updated_at?: string
          updated_by?: string | null
          weight?: number
          work_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "work_stages_budget_section_id_fkey"
            columns: ["budget_section_id"]
            isOneToOne: false
            referencedRelation: "budget_sections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_stages_dependency_id_fkey"
            columns: ["dependency_id"]
            isOneToOne: false
            referencedRelation: "work_stages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_stages_work_id_fkey"
            columns: ["work_id"]
            isOneToOne: false
            referencedRelation: "works"
            referencedColumns: ["id"]
          },
        ]
      }
      works: {
        Row: {
          actual_end: string | null
          actual_start: string | null
          address: string | null
          architect_id: string | null
          archived: boolean
          budget_id: string
          client_id: string | null
          created_at: string
          created_by: string | null
          id: string
          name: string
          planned_end: string | null
          planned_start: string | null
          responsible: string | null
          status: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          actual_end?: string | null
          actual_start?: string | null
          address?: string | null
          architect_id?: string | null
          archived?: boolean
          budget_id: string
          client_id?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          name: string
          planned_end?: string | null
          planned_start?: string | null
          responsible?: string | null
          status?: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          actual_end?: string | null
          actual_start?: string | null
          address?: string | null
          architect_id?: string | null
          archived?: boolean
          budget_id?: string
          client_id?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          name?: string
          planned_end?: string | null
          planned_start?: string | null
          responsible?: string | null
          status?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "works_architect_id_fkey"
            columns: ["architect_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "works_budget_id_fkey"
            columns: ["budget_id"]
            isOneToOne: true
            referencedRelation: "budgets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "works_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      can_see_costs: { Args: { _user_id: string }; Returns: boolean }
      convert_budget: { Args: { _budget_id: string }; Returns: string }
      copy_budget: {
        Args: { _as_revision: boolean; _budget_id: string }
        Returns: string
      }
      create_purchase: {
        Args: {
          _description: string
          _due_date: string
          _expected_date: string
          _lines: Json
          _supplier_id: string
          _work_id: string
        }
        Returns: string
      }
      evidence_exists: {
        Args: { _path: string; _prefix: string }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      receive_purchase: {
        Args: { _line_id: string; _quantity: number }
        Returns: undefined
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
