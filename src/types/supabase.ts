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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      customers: {
        Row: {
          created_at: string | null
          id: string
          name: string
          phone: string | null
          type: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          name: string
          phone?: string | null
          type?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string
          phone?: string | null
          type?: string | null
        }
        Relationships: []
      }
      financial_ledger: {
        Row: {
          amount: number
          created_at: string | null
          description: string | null
          entity_name: string
          id: string
          order_id: string | null
          type: Database["public"]["Enums"]["ledger_type"]
        }
        Insert: {
          amount: number
          created_at?: string | null
          description?: string | null
          entity_name: string
          id?: string
          order_id?: string | null
          type: Database["public"]["Enums"]["ledger_type"]
        }
        Update: {
          amount?: number
          created_at?: string | null
          description?: string | null
          entity_name?: string
          id?: string
          order_id?: string | null
          type?: Database["public"]["Enums"]["ledger_type"]
        }
        Relationships: [
          {
            foreignKeyName: "financial_ledger_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      financial_transactions: {
        Row: {
          amount: number
          category: string | null
          created_at: string | null
          date: string
          description: string | null
          id: string
          order_id: string | null
          type: Database["public"]["Enums"]["transaction_type"]
        }
        Insert: {
          amount: number
          category?: string | null
          created_at?: string | null
          date?: string
          description?: string | null
          id?: string
          order_id?: string | null
          type: Database["public"]["Enums"]["transaction_type"]
        }
        Update: {
          amount?: number
          category?: string | null
          created_at?: string | null
          date?: string
          description?: string | null
          id?: string
          order_id?: string | null
          type?: Database["public"]["Enums"]["transaction_type"]
        }
        Relationships: [
          {
            foreignKeyName: "financial_transactions_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      order_items: {
        Row: {
          description: string | null
          id: string
          order_id: string
          original_price: number | null
          product_name: string
          quantity: number
          quantity_delivered: number
          size: string | null
          unit_price: number
        }
        Insert: {
          description?: string | null
          id?: string
          order_id: string
          original_price?: number | null
          product_name: string
          quantity: number
          quantity_delivered?: number
          size?: string | null
          unit_price: number
        }
        Update: {
          description?: string | null
          id?: string
          order_id?: string
          original_price?: number | null
          product_name?: string
          quantity?: number
          quantity_delivered?: number
          size?: string | null
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          created_at: string | null
          customer_id: string | null
          delivery_date: string | null
          display_id: number
          down_payment: number | null
          due_date: string | null
          id: string
          is_internal_transfer: boolean
          notes: string | null
          payment_method: string | null
          status: Database["public"]["Enums"]["order_status"]
          total_value: number
        }
        Insert: {
          created_at?: string | null
          customer_id?: string | null
          delivery_date?: string | null
          display_id?: number
          down_payment?: number | null
          due_date?: string | null
          id?: string
          is_internal_transfer?: boolean
          notes?: string | null
          payment_method?: string | null
          status?: Database["public"]["Enums"]["order_status"]
          total_value: number
        }
        Update: {
          created_at?: string | null
          customer_id?: string | null
          delivery_date?: string | null
          display_id?: number
          down_payment?: number | null
          due_date?: string | null
          id?: string
          is_internal_transfer?: boolean
          notes?: string | null
          payment_method?: string | null
          status?: Database["public"]["Enums"]["order_status"]
          total_value?: number
        }
        Relationships: [
          {
            foreignKeyName: "orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          category: string | null
          created_at: string | null
          id: string
          name: string
          price: number
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          id?: string
          name: string
          price?: number
        }
        Update: {
          category?: string | null
          created_at?: string | null
          id?: string
          name?: string
          price?: number
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string | null
          email: string | null
          full_name: string | null
          id: string
          role: Database["public"]["Enums"]["user_role"]
        }
        Insert: {
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          id: string
          role?: Database["public"]["Enums"]["user_role"]
        }
        Update: {
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          role?: Database["public"]["Enums"]["user_role"]
        }
        Relationships: []
      }
      quote_items: {
        Row: {
          description: string | null
          id: string
          product_name: string
          quantity: number
          quote_id: string
          size: string | null
          unit_price: number
        }
        Insert: {
          description?: string | null
          id?: string
          product_name: string
          quantity: number
          quote_id: string
          size?: string | null
          unit_price: number
        }
        Update: {
          description?: string | null
          id?: string
          product_name?: string
          quantity?: number
          quote_id?: string
          size?: string | null
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "quote_items_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "quotes"
            referencedColumns: ["id"]
          },
        ]
      }
      quotes: {
        Row: {
          created_at: string | null
          customer_id: string | null
          description: string | null
          down_payment: number | null
          id: string
          payment_method: string | null
          status: Database["public"]["Enums"]["quote_status"]
          total_value: number
          valid_until: string | null
        }
        Insert: {
          created_at?: string | null
          customer_id?: string | null
          description?: string | null
          down_payment?: number | null
          id?: string
          payment_method?: string | null
          status?: Database["public"]["Enums"]["quote_status"]
          total_value: number
          valid_until?: string | null
        }
        Update: {
          created_at?: string | null
          customer_id?: string | null
          description?: string | null
          down_payment?: number | null
          id?: string
          payment_method?: string | null
          status?: Database["public"]["Enums"]["quote_status"]
          total_value?: number
          valid_until?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "quotes_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      ledger_type: "debt_accrual" | "payment"
      order_status:
        | "pending"
        | "in_progress"
        | "completed"
        | "delivered"
        | "cancelled"
      quote_status: "draft" | "sent" | "approved" | "rejected" | "converted"
      transaction_type: "income" | "expense"
      user_role: "admin" | "employee"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}




