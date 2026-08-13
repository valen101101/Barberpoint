// Tipos escritos a mano, reflejando schema.sql.
// Cuando el proyecto Supabase real exista, reemplazar este archivo por el
// resultado de:
//   npx supabase gen types typescript --project-id <id> > src/types/database.ts

export type ChannelType =
  | "whatsapp"
  | "instagram"
  | "facebook"
  | "tiktok"
  | "phone"
  | "email"
  | "other";

export type WaitlistStatus = "waiting" | "in_service" | "done" | "cancelled";

export type NotificationChannel = "whatsapp" | "sms" | "email" | "other";

export type NotificationMessageType =
  | "appointment_reminder"
  | "reactivation"
  | "promo"
  | "other";

export type NotificationStatus = "pending" | "sent" | "failed";

export type PaymentMethod = "cash" | "transfer" | "card" | "other";

export interface Database {
  public: {
    Tables: {
      barbers: {
        Row: {
          id: string;
          password_hash: string | null;
          full_name: string;
          phone: string | null;
          instagram: string | null;
          email: string | null;
          active: boolean;
          branch_id: string | null;
          commission_rate: number | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          password_hash?: string | null;
          full_name: string;
          phone?: string | null;
          instagram?: string | null;
          email?: string | null;
          active?: boolean;
          branch_id?: string | null;
          commission_rate?: number | null;
        };
        Update: Partial<Database["public"]["Tables"]["barbers"]["Insert"]>;
        Relationships: [];
      };
      clients: {
        Row: {
          id: string;
          first_name: string;
          last_name: string;
          client_number: number;
          is_generic: boolean;
          notes: string | null;
          active: boolean;
          branch_id: string | null;
          photo_url: string | null;
          preferred_style: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          first_name: string;
          last_name: string;
          client_number?: number;
          is_generic?: boolean;
          notes?: string | null;
          active?: boolean;
          branch_id?: string | null;
          photo_url?: string | null;
          preferred_style?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["clients"]["Insert"]>;
        Relationships: [];
      };
      client_contact_channels: {
        Row: {
          id: string;
          client_id: string;
          channel_type: ChannelType;
          value: string;
          is_primary: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          client_id: string;
          channel_type: ChannelType;
          value: string;
          is_primary?: boolean;
        };
        Update: Partial<
          Database["public"]["Tables"]["client_contact_channels"]["Insert"]
        >;
        Relationships: [
          {
            foreignKeyName: "client_contact_channels_client_id_fkey";
            columns: ["client_id"];
            isOneToOne: false;
            referencedRelation: "clients";
            referencedColumns: ["id"];
          },
        ];
      };
      client_barber_preferences: {
        Row: {
          id: string;
          client_id: string;
          barber_id: string;
          is_primary: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          client_id: string;
          barber_id: string;
          is_primary?: boolean;
        };
        Update: Partial<
          Database["public"]["Tables"]["client_barber_preferences"]["Insert"]
        >;
        Relationships: [
          {
            foreignKeyName: "client_barber_preferences_client_id_fkey";
            columns: ["client_id"];
            isOneToOne: false;
            referencedRelation: "clients";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "client_barber_preferences_barber_id_fkey";
            columns: ["barber_id"];
            isOneToOne: false;
            referencedRelation: "barbers";
            referencedColumns: ["id"];
          },
        ];
      };
      services: {
        Row: {
          id: string;
          name: string;
          description: string | null;
          active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          description?: string | null;
          active?: boolean;
        };
        Update: Partial<Database["public"]["Tables"]["services"]["Insert"]>;
        Relationships: [];
      };
      service_prices: {
        Row: {
          id: string;
          service_id: string;
          price: number;
          valid_from: string;
          valid_to: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          service_id: string;
          price: number;
          valid_from?: string;
          valid_to?: string | null;
        };
        Update: Partial<
          Database["public"]["Tables"]["service_prices"]["Insert"]
        >;
        Relationships: [
          {
            foreignKeyName: "service_prices_service_id_fkey";
            columns: ["service_id"];
            isOneToOne: false;
            referencedRelation: "services";
            referencedColumns: ["id"];
          },
        ];
      };
      visits: {
        Row: {
          id: string;
          client_id: string;
          barber_id: string;
          service_id: string;
          service_price_id: string;
          price_charged: number;
          tip_amount: number;
          payment_method: PaymentMethod;
          visit_date: string;
          notes: string | null;
          branch_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          client_id: string;
          barber_id: string;
          service_id: string;
          service_price_id: string;
          price_charged: number;
          tip_amount?: number;
          payment_method?: PaymentMethod;
          visit_date?: string;
          notes?: string | null;
          branch_id?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["visits"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "visits_client_id_fkey";
            columns: ["client_id"];
            isOneToOne: false;
            referencedRelation: "clients";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "visits_barber_id_fkey";
            columns: ["barber_id"];
            isOneToOne: false;
            referencedRelation: "barbers";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "visits_service_id_fkey";
            columns: ["service_id"];
            isOneToOne: false;
            referencedRelation: "services";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "visits_service_price_id_fkey";
            columns: ["service_price_id"];
            isOneToOne: false;
            referencedRelation: "service_prices";
            referencedColumns: ["id"];
          },
        ];
      };
      alert_rules: {
        Row: {
          id: string;
          name: string;
          days_since_last_visit: number;
          active: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          days_since_last_visit: number;
          active?: boolean;
        };
        Update: Partial<
          Database["public"]["Tables"]["alert_rules"]["Insert"]
        >;
        Relationships: [];
      };
      branches: {
        Row: {
          id: string;
          name: string;
          active: boolean;
          created_at: string;
        };
        Insert: { id?: string; name: string; active?: boolean };
        Update: Partial<Database["public"]["Tables"]["branches"]["Insert"]>;
        Relationships: [];
      };
      products: {
        Row: {
          id: string;
          name: string;
          sku: string | null;
          price: number;
          stock_quantity: number;
          active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          sku?: string | null;
          price: number;
          stock_quantity?: number;
          active?: boolean;
        };
        Update: Partial<Database["public"]["Tables"]["products"]["Insert"]>;
        Relationships: [];
      };
      product_sales: {
        Row: {
          id: string;
          product_id: string;
          client_id: string | null;
          barber_id: string | null;
          visit_id: string | null;
          quantity: number;
          unit_price_charged: number;
          sold_at: string;
        };
        Insert: {
          id?: string;
          product_id: string;
          client_id?: string | null;
          barber_id?: string | null;
          visit_id?: string | null;
          quantity?: number;
          unit_price_charged: number;
        };
        Update: Partial<
          Database["public"]["Tables"]["product_sales"]["Insert"]
        >;
        Relationships: [
          {
            foreignKeyName: "product_sales_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "products";
            referencedColumns: ["id"];
          },
        ];
      };
      loyalty_point_events: {
        Row: {
          id: string;
          client_id: string;
          points_delta: number;
          reason: string | null;
          visit_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          client_id: string;
          points_delta: number;
          reason?: string | null;
          visit_id?: string | null;
        };
        Update: Partial<
          Database["public"]["Tables"]["loyalty_point_events"]["Insert"]
        >;
        Relationships: [
          {
            foreignKeyName: "loyalty_point_events_client_id_fkey";
            columns: ["client_id"];
            isOneToOne: false;
            referencedRelation: "clients";
            referencedColumns: ["id"];
          },
        ];
      };
      waitlist_entries: {
        Row: {
          id: string;
          client_id: string | null;
          walk_in_name: string | null;
          preferred_barber_id: string | null;
          status: WaitlistStatus;
          joined_at: string;
          called_at: string | null;
          finished_at: string | null;
        };
        Insert: {
          id?: string;
          client_id?: string | null;
          walk_in_name?: string | null;
          preferred_barber_id?: string | null;
          status?: WaitlistStatus;
          called_at?: string | null;
          finished_at?: string | null;
        };
        Update: Partial<
          Database["public"]["Tables"]["waitlist_entries"]["Insert"]
        >;
        Relationships: [];
      };
      client_notifications: {
        Row: {
          id: string;
          client_id: string;
          channel: NotificationChannel;
          message_type: NotificationMessageType;
          status: NotificationStatus;
          related_alert_rule_id: string | null;
          sent_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          client_id: string;
          channel: NotificationChannel;
          message_type: NotificationMessageType;
          status?: NotificationStatus;
          related_alert_rule_id?: string | null;
          sent_at?: string | null;
        };
        Update: Partial<
          Database["public"]["Tables"]["client_notifications"]["Insert"]
        >;
        Relationships: [];
      };
    };
    Views: {
      client_stats: {
        Row: {
          client_id: string;
          first_name: string;
          last_name: string;
          client_number: number;
          total_visits: number;
          last_visit_date: string | null;
          days_since_last_visit: number | null;
          total_spent: number;
          avg_days_between_visits: number | null;
        };
        Relationships: [];
      };
      barber_earnings: {
        Row: {
          barber_id: string;
          full_name: string;
          total_visits: number;
          total_services_revenue: number;
          total_tips: number;
          commission_rate: number | null;
          estimated_commission: number;
        };
        Relationships: [];
      };
      client_loyalty_balance: {
        Row: {
          client_id: string;
          points_balance: number;
        };
        Relationships: [];
      };
    };
    Functions: Record<string, never>;
  };
}

export type Tables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Row"];
export type TablesInsert<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Insert"];
export type Views<T extends keyof Database["public"]["Views"]> =
  Database["public"]["Views"][T]["Row"];
