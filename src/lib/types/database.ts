export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type LoadStatus =
  | 'quoted'
  | 'booked'
  | 'dispatched'
  | 'en_route_pickup'
  | 'at_pickup'
  | 'loaded'
  | 'en_route_delivery'
  | 'at_delivery'
  | 'delivered'
  | 'invoiced'
  | 'paid'
  | 'complete'
  | 'customer_paid'

export type LoadType = 'TL' | 'LTL'

export type EquipmentCode = 'FH' | 'F' | 'V' | 'STLG' | 'R' | 'SD' | 'OTHER'

export type UserRole = 'admin' | 'broker' | 'accountant'
export type CustomerUserRole = 'admin' | 'viewer'
export type DocumentType = 'rate_con' | 'bol' | 'pod' | 'invoice' | 'other'
export type UploaderType = 'broker' | 'driver' | 'customer'

export interface Database {
  public: {
    Tables: {
      organizations: {
        Row: {
          id: string
          name: string
          slug: string
          logo_url: string | null
          primary_color: string
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          slug: string
          logo_url?: string | null
          primary_color?: string
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          slug?: string
          logo_url?: string | null
          primary_color?: string
          created_at?: string
        }
      }
      users: {
        Row: {
          id: string
          organization_id: string | null
          email: string
          full_name: string | null
          role: UserRole
          created_at: string
        }
        Insert: {
          id: string
          organization_id?: string | null
          email: string
          full_name?: string | null
          role?: UserRole
          created_at?: string
        }
        Update: {
          id?: string
          organization_id?: string | null
          email?: string
          full_name?: string | null
          role?: UserRole
          created_at?: string
        }
      }
      customers: {
        Row: {
          id: string
          organization_id: string | null
          company_name: string
          slug: string
          contact_name: string | null
          contact_email: string | null
          contact_phone: string | null
          portal_enabled: boolean
          created_at: string
        }
        Insert: {
          id?: string
          organization_id?: string | null
          company_name: string
          slug: string
          contact_name?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          portal_enabled?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          organization_id?: string | null
          company_name?: string
          slug?: string
          contact_name?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          portal_enabled?: boolean
          created_at?: string
        }
      }
      customer_users: {
        Row: {
          id: string
          customer_id: string | null
          email: string
          full_name: string | null
          role: CustomerUserRole
          created_at: string
        }
        Insert: {
          id: string
          customer_id?: string | null
          email: string
          full_name?: string | null
          role?: CustomerUserRole
          created_at?: string
        }
        Update: {
          id?: string
          customer_id?: string | null
          email?: string
          full_name?: string | null
          role?: CustomerUserRole
          created_at?: string
        }
      }
      carriers: {
        Row: {
          id: string
          organization_id: string | null
          company_name: string
          mc_number: string | null
          dot_number: string | null
          contact_name: string | null
          contact_email: string | null
          contact_phone: string | null
          created_at: string
        }
        Insert: {
          id?: string
          organization_id?: string | null
          company_name: string
          mc_number?: string | null
          dot_number?: string | null
          contact_name?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          organization_id?: string | null
          company_name?: string
          mc_number?: string | null
          dot_number?: string | null
          contact_name?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string
        }
      }
      drivers: {
        Row: {
          id: string
          carrier_id: string | null
          phone: string
          name: string | null
          truck_number: string | null
          device_token: string | null
          created_at: string
        }
        Insert: {
          id?: string
          carrier_id?: string | null
          phone: string
          name?: string | null
          truck_number?: string | null
          device_token?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          carrier_id?: string | null
          phone?: string
          name?: string | null
          truck_number?: string | null
          device_token?: string | null
          created_at?: string
        }
      }
      loads: {
        Row: {
          id: string
          organization_id: string | null
          customer_id: string | null
          carrier_id: string | null
          driver_id: string | null
          reference_number: string
          status: LoadStatus
          origin_address: string
          origin_city: string | null
          origin_state: string | null
          origin_lat: number | null
          origin_lng: number | null
          pickup_date: string | null
          pickup_time_start: string | null
          pickup_time_end: string | null
          dest_address: string
          dest_city: string | null
          dest_state: string | null
          dest_lat: number | null
          dest_lng: number | null
          delivery_date: string | null
          delivery_time_start: string | null
          delivery_time_end: string | null
          commodity: string | null
          weight: number | null
          equipment_type: string
          special_instructions: string | null
          customer_rate: number | null
          carrier_rate: number | null
          current_lat: number | null
          current_lng: number | null
          current_location_updated_at: string | null
          eta: string | null
          tracking_token: string
          created_at: string
          updated_at: string
          // New fields
          booked_date: string | null
          pickup_name: string | null
          pickup_contact: string | null
          pickup_phone: string | null
          pickup_notes: string | null
          delivery_name: string | null
          delivery_contact: string | null
          delivery_phone: string | null
          delivery_notes: string | null
          equipment_code: string | null
          hauler_name: string | null
          pro_number: string | null
          po_number: string | null
          bol_number: string | null
          rate_con_received: boolean
          pod_received: boolean
          carrier_invoice_received: boolean
          sales_rep_1: string | null
          sales_rep_2: string | null
          load_type: 'TL' | 'LTL'
        }
        Insert: {
          id?: string
          organization_id?: string | null
          customer_id?: string | null
          carrier_id?: string | null
          driver_id?: string | null
          reference_number: string
          status?: LoadStatus
          origin_address: string
          origin_city?: string | null
          origin_state?: string | null
          origin_lat?: number | null
          origin_lng?: number | null
          pickup_date?: string | null
          pickup_time_start?: string | null
          pickup_time_end?: string | null
          dest_address: string
          dest_city?: string | null
          dest_state?: string | null
          dest_lat?: number | null
          dest_lng?: number | null
          delivery_date?: string | null
          delivery_time_start?: string | null
          delivery_time_end?: string | null
          commodity?: string | null
          weight?: number | null
          equipment_type?: string
          special_instructions?: string | null
          customer_rate?: number | null
          carrier_rate?: number | null
          current_lat?: number | null
          current_lng?: number | null
          current_location_updated_at?: string | null
          eta?: string | null
          tracking_token?: string
          created_at?: string
          updated_at?: string
          // New fields
          booked_date?: string | null
          pickup_name?: string | null
          pickup_contact?: string | null
          pickup_phone?: string | null
          pickup_notes?: string | null
          delivery_name?: string | null
          delivery_contact?: string | null
          delivery_phone?: string | null
          delivery_notes?: string | null
          equipment_code?: string | null
          hauler_name?: string | null
          pro_number?: string | null
          po_number?: string | null
          bol_number?: string | null
          rate_con_received?: boolean
          pod_received?: boolean
          carrier_invoice_received?: boolean
          sales_rep_1?: string | null
          sales_rep_2?: string | null
          load_type?: 'TL' | 'LTL'
        }
        Update: {
          id?: string
          organization_id?: string | null
          customer_id?: string | null
          carrier_id?: string | null
          driver_id?: string | null
          reference_number?: string
          status?: LoadStatus
          origin_address?: string
          origin_city?: string | null
          origin_state?: string | null
          origin_lat?: number | null
          origin_lng?: number | null
          pickup_date?: string | null
          pickup_time_start?: string | null
          pickup_time_end?: string | null
          dest_address?: string
          dest_city?: string | null
          dest_state?: string | null
          dest_lat?: number | null
          dest_lng?: number | null
          delivery_date?: string | null
          delivery_time_start?: string | null
          delivery_time_end?: string | null
          commodity?: string | null
          weight?: number | null
          equipment_type?: string
          special_instructions?: string | null
          customer_rate?: number | null
          carrier_rate?: number | null
          current_lat?: number | null
          current_lng?: number | null
          current_location_updated_at?: string | null
          eta?: string | null
          tracking_token?: string
          created_at?: string
          updated_at?: string
          // New fields
          booked_date?: string | null
          pickup_name?: string | null
          pickup_contact?: string | null
          pickup_phone?: string | null
          pickup_notes?: string | null
          delivery_name?: string | null
          delivery_contact?: string | null
          delivery_phone?: string | null
          delivery_notes?: string | null
          equipment_code?: string | null
          hauler_name?: string | null
          pro_number?: string | null
          po_number?: string | null
          bol_number?: string | null
          rate_con_received?: boolean
          pod_received?: boolean
          carrier_invoice_received?: boolean
          sales_rep_1?: string | null
          sales_rep_2?: string | null
          load_type?: 'TL' | 'LTL'
        }
      }
      location_history: {
        Row: {
          id: string
          load_id: string | null
          driver_id: string | null
          lat: number
          lng: number
          speed: number | null
          heading: number | null
          recorded_at: string
        }
        Insert: {
          id?: string
          load_id?: string | null
          driver_id?: string | null
          lat: number
          lng: number
          speed?: number | null
          heading?: number | null
          recorded_at?: string
        }
        Update: {
          id?: string
          load_id?: string | null
          driver_id?: string | null
          lat?: number
          lng?: number
          speed?: number | null
          heading?: number | null
          recorded_at?: string
        }
      }
      documents: {
        Row: {
          id: string
          load_id: string | null
          uploaded_by_type: UploaderType | null
          uploaded_by_id: string | null
          type: DocumentType
          file_name: string
          file_url: string
          file_size: number | null
          captured_lat: number | null
          captured_lng: number | null
          captured_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          load_id?: string | null
          uploaded_by_type?: UploaderType | null
          uploaded_by_id?: string | null
          type: DocumentType
          file_name: string
          file_url: string
          file_size?: number | null
          captured_lat?: number | null
          captured_lng?: number | null
          captured_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          load_id?: string | null
          uploaded_by_type?: UploaderType | null
          uploaded_by_id?: string | null
          type?: DocumentType
          file_name?: string
          file_url?: string
          file_size?: number | null
          captured_lat?: number | null
          captured_lng?: number | null
          captured_at?: string | null
          created_at?: string
        }
      }
      status_history: {
        Row: {
          id: string
          load_id: string | null
          status: string
          lat: number | null
          lng: number | null
          notes: string | null
          created_by_type: string | null
          created_by_id: string | null
          created_at: string
        }
        Insert: {
          id?: string
          load_id?: string | null
          status: string
          lat?: number | null
          lng?: number | null
          notes?: string | null
          created_by_type?: string | null
          created_by_id?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          load_id?: string | null
          status?: string
          lat?: number | null
          lng?: number | null
          notes?: string | null
          created_by_type?: string | null
          created_by_id?: string | null
          created_at?: string
        }
      }
    }
  }
}

// Helper types for easier use
export type Organization = Database['public']['Tables']['organizations']['Row']
export type User = Database['public']['Tables']['users']['Row']
export type Customer = Database['public']['Tables']['customers']['Row']
export type CustomerUser = Database['public']['Tables']['customer_users']['Row']
export type Carrier = Database['public']['Tables']['carriers']['Row']
export type Driver = Database['public']['Tables']['drivers']['Row']
export type Load = Database['public']['Tables']['loads']['Row']
export type LocationHistory = Database['public']['Tables']['location_history']['Row']
export type Document = Database['public']['Tables']['documents']['Row']
export type StatusHistory = Database['public']['Tables']['status_history']['Row']

// Extended types with relations
export type LoadWithRelations = Load & {
  customer?: Customer | null
  carrier?: Carrier | null
  driver?: Driver | null
  documents?: Document[]
  status_history?: StatusHistory[]
}
