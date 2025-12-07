// Template variables available for document generation
// These map to load data fields

export interface TemplateVariable {
  key: string
  label: string
  category: string
  example: string
}

export const templateVariables: TemplateVariable[] = [
  // Load Info
  { key: 'reference_number', label: 'Load Number', category: 'Load', example: 'LD-2024-001' },
  { key: 'pro_number', label: 'PRO Number', category: 'Load', example: 'PRO-12345' },
  { key: 'po_number', label: 'PO Number', category: 'Load', example: 'PO-67890' },
  { key: 'bol_number', label: 'BOL Number', category: 'Load', example: 'BOL-11111' },
  { key: 'status', label: 'Load Status', category: 'Load', example: 'Dispatched' },
  { key: 'load_type', label: 'Load Type', category: 'Load', example: 'TL' },
  { key: 'booked_date', label: 'Booked Date', category: 'Load', example: '12/06/2024' },

  // Freight Details
  { key: 'commodity', label: 'Commodity', category: 'Freight', example: 'Automotive Parts' },
  { key: 'weight', label: 'Weight (lbs)', category: 'Freight', example: '42,000' },
  { key: 'equipment_type', label: 'Equipment Type', category: 'Freight', example: 'Dry Van' },
  { key: 'equipment_code', label: 'Equipment Code', category: 'Freight', example: 'V' },
  { key: 'special_instructions', label: 'Special Instructions', category: 'Freight', example: 'Call 30 min before arrival' },

  // Pickup
  { key: 'pickup_name', label: 'Pickup Location Name', category: 'Pickup', example: 'ABC Warehouse' },
  { key: 'origin_address', label: 'Pickup Address', category: 'Pickup', example: '123 Industrial Blvd' },
  { key: 'origin_city', label: 'Pickup City', category: 'Pickup', example: 'Houston' },
  { key: 'origin_state', label: 'Pickup State', category: 'Pickup', example: 'TX' },
  { key: 'pickup_city_state', label: 'Pickup City, State', category: 'Pickup', example: 'Houston, TX' },
  { key: 'pickup_full_address', label: 'Pickup Full Address', category: 'Pickup', example: '123 Industrial Blvd, Houston, TX' },
  { key: 'pickup_date', label: 'Pickup Date', category: 'Pickup', example: '12/10/2024' },
  { key: 'pickup_time', label: 'Pickup Time Window', category: 'Pickup', example: '08:00 - 12:00' },
  { key: 'pickup_contact', label: 'Pickup Contact', category: 'Pickup', example: 'John Smith' },
  { key: 'pickup_phone', label: 'Pickup Phone', category: 'Pickup', example: '(555) 123-4567' },
  { key: 'pickup_notes', label: 'Pickup Notes', category: 'Pickup', example: 'Dock 5' },

  // Delivery
  { key: 'delivery_name', label: 'Delivery Location Name', category: 'Delivery', example: 'XYZ Distribution' },
  { key: 'dest_address', label: 'Delivery Address', category: 'Delivery', example: '456 Commerce Dr' },
  { key: 'dest_city', label: 'Delivery City', category: 'Delivery', example: 'Dallas' },
  { key: 'dest_state', label: 'Delivery State', category: 'Delivery', example: 'TX' },
  { key: 'delivery_city_state', label: 'Delivery City, State', category: 'Delivery', example: 'Dallas, TX' },
  { key: 'delivery_full_address', label: 'Delivery Full Address', category: 'Delivery', example: '456 Commerce Dr, Dallas, TX' },
  { key: 'delivery_date', label: 'Delivery Date', category: 'Delivery', example: '12/11/2024' },
  { key: 'delivery_time', label: 'Delivery Time Window', category: 'Delivery', example: '14:00 - 18:00' },
  { key: 'delivery_contact', label: 'Delivery Contact', category: 'Delivery', example: 'Jane Doe' },
  { key: 'delivery_phone', label: 'Delivery Phone', category: 'Delivery', example: '(555) 987-6543' },
  { key: 'delivery_notes', label: 'Delivery Notes', category: 'Delivery', example: 'Check in at security' },

  // Rates
  { key: 'customer_rate', label: 'Customer Rate', category: 'Rates', example: '$2,500.00' },
  { key: 'carrier_rate', label: 'Carrier Rate', category: 'Rates', example: '$2,100.00' },
  { key: 'margin', label: 'Margin', category: 'Rates', example: '$400.00' },
  { key: 'pay_terms', label: 'Payment Terms', category: 'Rates', example: 'Net 30' },
  { key: 'freight_terms', label: 'Freight Terms', category: 'Rates', example: 'PREPAID' },

  // Customer
  { key: 'customer.company_name', label: 'Customer Name', category: 'Customer', example: 'Acme Corp' },
  { key: 'customer.contact_name', label: 'Customer Contact', category: 'Customer', example: 'Bob Wilson' },
  { key: 'customer.contact_email', label: 'Customer Email', category: 'Customer', example: 'bob@acme.com' },
  { key: 'customer.contact_phone', label: 'Customer Phone', category: 'Customer', example: '(555) 111-2222' },

  // Carrier
  { key: 'carrier.company_name', label: 'Carrier Name', category: 'Carrier', example: 'Fast Freight LLC' },
  { key: 'carrier.mc_number', label: 'Carrier MC#', category: 'Carrier', example: '123456' },
  { key: 'carrier.dot_number', label: 'Carrier DOT#', category: 'Carrier', example: '789012' },
  { key: 'carrier.contact_name', label: 'Carrier Contact', category: 'Carrier', example: 'Mike Jones' },
  { key: 'carrier.contact_phone', label: 'Carrier Phone', category: 'Carrier', example: '(555) 333-4444' },
  { key: 'carrier.contact_email', label: 'Carrier Email', category: 'Carrier', example: 'dispatch@fastfreight.com' },

  // Driver
  { key: 'driver.name', label: 'Driver Name', category: 'Driver', example: 'James Wilson' },
  { key: 'driver.phone', label: 'Driver Phone', category: 'Driver', example: '(555) 555-5555' },
  { key: 'driver.truck_number', label: 'Truck Number', category: 'Driver', example: 'T-101' },
  { key: 'driver.trailer_number', label: 'Trailer Number', category: 'Driver', example: 'TR-202' },

  // Broker Info (from env/settings)
  { key: 'broker.name', label: 'Broker Company Name', category: 'Broker', example: 'KHCL Logistics, LLC' },
  { key: 'broker.address', label: 'Broker Address', category: 'Broker', example: '174 Grandview Dr' },
  { key: 'broker.city_state_zip', label: 'Broker City, State ZIP', category: 'Broker', example: 'Florence, MS 39073' },
  { key: 'broker.mc', label: 'Broker MC#', category: 'Broker', example: '123853' },
  { key: 'broker.phone', label: 'Broker Phone', category: 'Broker', example: '(601) 750-2330' },
  { key: 'broker.fax', label: 'Broker Fax', category: 'Broker', example: '(601) 750-2331' },
  { key: 'broker.email', label: 'Broker Email', category: 'Broker', example: 'dispatch@khcllogistics.com' },

  // Generated
  { key: 'current_date', label: 'Current Date', category: 'Generated', example: '12/06/2024' },
  { key: 'current_time', label: 'Current Time', category: 'Generated', example: '2:30 PM' },
  { key: 'current_datetime', label: 'Current Date & Time', category: 'Generated', example: '12/06/2024 2:30 PM' },
]

// Group variables by category
export function getVariablesByCategory(): Record<string, TemplateVariable[]> {
  const grouped: Record<string, TemplateVariable[]> = {}
  for (const v of templateVariables) {
    if (!grouped[v.category]) {
      grouped[v.category] = []
    }
    grouped[v.category].push(v)
  }
  return grouped
}

// Sample data for preview
export const sampleLoadData = {
  reference_number: 'LD-2024-001',
  pro_number: 'PRO-12345',
  po_number: 'PO-67890',
  bol_number: 'BOL-11111',
  status: 'Dispatched',
  load_type: 'TL',
  booked_date: '12/06/2024',

  commodity: 'Automotive Parts',
  weight: '42,000',
  equipment_type: 'Dry Van',
  equipment_code: 'V',
  special_instructions: 'Driver must call 30 minutes before arrival. No lumper fees.',

  pickup_name: 'ABC Manufacturing',
  origin_address: '123 Industrial Blvd',
  origin_city: 'Houston',
  origin_state: 'TX',
  pickup_city_state: 'Houston, TX',
  pickup_full_address: '123 Industrial Blvd, Houston, TX',
  pickup_date: '12/10/2024',
  pickup_time: '08:00 - 12:00',
  pickup_contact: 'John Smith',
  pickup_phone: '(555) 123-4567',
  pickup_notes: 'Dock 5 - Shipping department',

  delivery_name: 'XYZ Distribution Center',
  dest_address: '456 Commerce Dr',
  dest_city: 'Dallas',
  dest_state: 'TX',
  delivery_city_state: 'Dallas, TX',
  delivery_full_address: '456 Commerce Dr, Dallas, TX',
  delivery_date: '12/11/2024',
  delivery_time: '14:00 - 18:00',
  delivery_contact: 'Jane Doe',
  delivery_phone: '(555) 987-6543',
  delivery_notes: 'Check in at security gate',

  customer_rate: '$2,500.00',
  carrier_rate: '$2,100.00',
  margin: '$400.00',
  pay_terms: 'Net 30',
  freight_terms: 'PREPAID',

  'customer.company_name': 'Acme Corporation',
  'customer.contact_name': 'Bob Wilson',
  'customer.contact_email': 'bob@acmecorp.com',
  'customer.contact_phone': '(555) 111-2222',

  'carrier.company_name': 'Fast Freight LLC',
  'carrier.mc_number': '123456',
  'carrier.dot_number': '789012',
  'carrier.contact_name': 'Mike Jones',
  'carrier.contact_phone': '(555) 333-4444',
  'carrier.contact_email': 'dispatch@fastfreight.com',

  'driver.name': 'James Wilson',
  'driver.phone': '(555) 555-5555',
  'driver.truck_number': 'T-101',
  'driver.trailer_number': 'TR-202',

  'broker.name': 'KHCL Logistics, LLC',
  'broker.address': '174 Grandview Dr',
  'broker.city_state_zip': 'Florence, MS 39073',
  'broker.mc': '123853',
  'broker.phone': '(601) 750-2330',
  'broker.fax': '(601) 750-2331',
  'broker.email': 'dispatch@khcllogistics.com',

  current_date: new Date().toLocaleDateString(),
  current_time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
  current_datetime: new Date().toLocaleString(),
}

// Replace variables in template
export function replaceTemplateVariables(template: string, data: Record<string, string | undefined>): string {
  return template.replace(/\{\{(\w+(?:\.\w+)?)\}\}/g, (match, key) => {
    return data[key] || match
  })
}
