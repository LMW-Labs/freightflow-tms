# VectrLoadAI - Intelligent Freight Management

An AI-powered Transportation Management System (TMS) for freight brokers. Built with Next.js 16, Supabase, and Tailwind CSS. Features intelligent integrations, real-time tracking, and upcoming AI-powered automation.

## Features

### Broker Dashboard
- **Load Management**: Create, edit, and track shipments through their entire lifecycle
- **Customer Management**: Maintain customer profiles with portal access
- **Carrier Management**: Full carrier profiles with W9, factoring, remittance, and equipment info
- **Live GPS Tracking**: Real-time map view of all active loads
- **Document Management**: Store and organize BOLs, PODs, rate confirmations, and invoices
- **Document Templates**: Visual HTML template editor for custom rate cons, BOLs, and invoices
- **Email Integration**: Send rate confirmations, tracking links, and notifications via Resend
- **Status Workflow**: Full load lifecycle from quote to payment
- **Team Management**: Invite staff with role-based permissions

### Customer Portal
- **Auto-generated portals**: Each customer gets their own portal at `/portal/[company-slug]`
- **Load visibility**: Customers see only their loads
- **Load Request Form**: Customers can submit new shipment requests
- **Real-time tracking**: Live GPS updates on shipments
- **Document access**: Download PODs and other documents
- **Branded experience**: White-label with custom logo and colors

### Driver PWA (Progressive Web App)
- **Phone-based login**: Drivers authenticate via phone number
- **GPS tracking**: Automatic location updates every 30 seconds
- **Status updates**: One-tap status changes (at pickup, loaded, delivered, etc.)
- **Document capture**: Camera integration for POD photos with GPS stamps
- **Offline capable**: Works with intermittent connectivity

### Public Tracking
- **Shareable links**: Send tracking URLs to anyone
- **No authentication required**: Recipients view load status without login
- **Real-time updates**: Live map and status information

---

### Document Templates
- **Visual HTML Editor**: TipTap-powered rich text editor for creating custom templates
- **Template Types**: Rate confirmations, BOLs, invoices, and custom documents
- **Variable Placeholders**: Use `{{load_number}}`, `{{customer_name}}`, etc. for dynamic content
- **Live Preview**: Preview templates with sample data before saving
- **PDF Generation**: Convert HTML templates to professional PDFs via Puppeteer
- **White Glove Service**: Request custom template designs from VectrLoadAI team

### Email Integration
- **Resend API**: Professional email delivery for all notifications
- **Rate Confirmation Emails**: Send branded rate cons directly to carriers
- **Tracking Link Emails**: Share public tracking URLs with customers
- **Custom Design Requests**: Email-based workflow for white glove template service

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | Next.js 16 (App Router) |
| React | React 19 |
| Language | TypeScript |
| Database | Supabase (PostgreSQL) |
| Auth | Supabase Auth |
| Storage | Supabase Storage |
| Realtime | Supabase Realtime |
| Styling | Tailwind CSS 4 + shadcn/ui |
| Charts | Recharts |
| Maps | Leaflet + OpenStreetMap (free) |
| Rich Text Editor | TipTap |
| PDF Generation | Puppeteer |
| Email | Resend |
| Icons | Lucide React |
| Hosting | Vercel |
| Integrations | QuickBooks, DAT, Truckstop, Highway, Macropoint, Denim |
| AI (Phase 2) | OpenAI, Anthropic Claude |

---

## Getting Started

### Prerequisites

- Node.js 18+
- npm, yarn, pnpm, or bun
- Supabase account (free tier works)

### 1. Clone and Install

```bash
cd tms-app
npm install
```

### 2. Set Up Supabase

1. Create a new project at [supabase.com](https://supabase.com)
2. Wait for the project to initialize (~2 minutes)
3. Go to **Project Settings** > **API** and copy:
   - Project URL
   - `anon` public key
   - `service_role` secret key

### 3. Configure Environment

Copy the example environment file and fill in your values:

```bash
cp .env.local.example .env.local
```

Edit `.env.local`:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_COMPANY_NAME=Your Company Name

# Email (Resend)
RESEND_API_KEY=re_xxxxxxxxxxxxx
EMAIL_FROM=noreply@yourdomain.com
```

### 4. Set Up Database

1. Go to your Supabase project's **SQL Editor**
2. Copy the contents of `supabase/schema.sql`
3. Paste and run the SQL to create all tables, indexes, and RLS policies

### 5. Set Up Storage

1. Go to **Storage** in your Supabase dashboard
2. Create a new bucket called `documents`
3. Set the bucket to **Public** (for POD access)
4. Add a storage policy to allow uploads:

```sql
-- Allow authenticated users to upload
CREATE POLICY "Allow authenticated uploads" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'documents');

-- Allow public read access
CREATE POLICY "Allow public read" ON storage.objects
FOR SELECT TO public
USING (bucket_id = 'documents');
```

### 6. Enable Auth

1. Go to **Authentication** > **Providers**
2. Enable **Email** provider (for broker/customer login)
3. Enable **Phone** provider (for driver login)
   - Configure SMS provider (Twilio recommended) or use Supabase's built-in (limited)

### 7. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## Application URLs

### Broker Dashboard (Authenticated)
| Route | Description |
|-------|-------------|
| `/` | Main dashboard with stats and recent loads |
| `/loads` | All loads list |
| `/loads/new` | Create a new load |
| `/loads/[id]` | Load detail page |
| `/customers` | Customer management |
| `/customers/new` | Add new customer (with portal setup) |
| `/carriers` | Carrier management |
| `/carriers/new` | Add new carrier |
| `/tracking` | Live GPS tracking map |
| `/documents` | Document management and templates |
| `/team` | Team management and staff invites |

### Customer Portal (Public/Auth)
| Route | Description |
|-------|-------------|
| `/portal/[slug]` | Customer dashboard (e.g., `/portal/acme-manufacturing`) |
| `/portal/[slug]/login` | Customer portal login |
| `/portal/[slug]/loads` | Customer's shipments list |
| `/portal/[slug]/loads/[id]` | Shipment detail with tracking |

### Driver App (Public)
| Route | Description |
|-------|-------------|
| `/driver` | Driver login and active load view |
| `/driver/scan` | Document capture (POD photos) |

### Public Pages
| Route | Description |
|-------|-------------|
| `/welcome` | Landing page |
| `/login` | Broker/staff login |
| `/track/[token]` | Public tracking link (no auth required) |
| `/invite/accept` | Accept staff/customer invite |

### Demo Customer Portals (after loading mock data)
- `/portal/acme-manufacturing` - Acme Manufacturing
- `/portal/global-foods` - Global Foods Distribution
- `/portal/swift-electronics` - Swift Electronics
- `/portal/premier-building` - Premier Building Supplies
- `/portal/midwest-grain` - Midwest Grain Co

### Demo Driver Logins (phone numbers)
| Driver | Phone | Carrier |
|--------|-------|---------|
| John Rodriguez | `5556011111` | Express Freight Lines |
| Maria Santos | `5556022222` | Reliable Transport Inc |
| James Wilson | `5556033333` | Highway Masters LLC |
| Sarah Mitchell | `5556044444` | CrossCountry Haulers |
| Mike Chang | `5556055555` | Swift Carriers |

---

## Usage Walkthrough

### Creating Your First Load

1. **Login** at `/login` with your broker credentials
2. Go to **Dashboard** > **Loads** > **New Load**
3. Fill in:
   - Reference number (auto-generated or custom)
   - Customer (select or create new)
   - Origin address, city, state
   - Destination address, city, state
   - Pickup/delivery dates and times
   - Rates (customer rate, carrier rate)
   - Equipment type and commodity
4. Click **Create Load**

### Assigning a Carrier and Driver

1. Open the load detail page
2. Click **Assign Carrier**
3. Select a carrier from your list (or create new)
4. Assign a driver by phone number
5. The driver will receive a link to the Driver PWA

### Driver Workflow

1. Driver opens the link on their phone
2. Enters their phone number to authenticate
3. Sees their assigned load with pickup/delivery info
4. Taps **Start Tracking** to begin GPS updates
5. Updates status: "At Pickup" → "Loaded" → "En Route" → "At Delivery" → "Delivered"
6. Captures POD photo with GPS stamp

### Customer Portal Access

1. Create a customer with `portal_enabled: true`
2. Customer logs in at `/portal/[company-slug]`
3. They see only their loads
4. Can track shipments in real-time
5. Download PODs when available

### Sharing Tracking Links

Each load has a unique `tracking_token`. Share the public tracking URL:

```
https://your-domain.com/track/[tracking-token]
```

Recipients can view:
- Current status
- Live GPS location on map
- Origin and destination
- ETA (if available)

---

## Project Structure

```
tms-app/
├── src/
│   ├── app/
│   │   ├── (dashboard)/         # Broker dashboard (route group - no /dashboard in URL)
│   │   │   ├── page.tsx         # / - Main dashboard
│   │   │   ├── loads/           # /loads - Load management
│   │   │   ├── customers/       # /customers - Customer management
│   │   │   ├── carriers/        # /carriers - Carrier management
│   │   │   ├── tracking/        # /tracking - Live tracking map
│   │   │   └── team/            # /team - Team management
│   │   ├── api/                 # API routes
│   │   │   ├── locations/       # GPS updates from drivers
│   │   │   ├── documents/       # File uploads and PDF generation
│   │   │   ├── send-rate-con/   # Email rate confirmations
│   │   │   ├── request-custom-design/  # White glove service requests
│   │   │   └── invites/         # Staff/customer invite handling
│   │   ├── driver/              # /driver - Driver PWA
│   │   ├── portal/              # Customer portals
│   │   │   └── [slug]/          # /portal/[company-slug] - Dynamic customer routes
│   │   ├── track/               # Public tracking
│   │   │   └── [token]/         # /track/[token] - Token-based access
│   │   ├── invite/              # /invite - Invite acceptance
│   │   ├── login/               # /login - Auth page
│   │   └── welcome/             # /welcome - Landing page
│   ├── components/
│   │   ├── dashboard/           # Dashboard components (Sidebar, StatusBadge)
│   │   ├── maps/                # Map components (TrackingMap)
│   │   └── ui/                  # shadcn/ui components
│   └── lib/
│       ├── supabase/            # Supabase clients (client, server, middleware)
│       └── types/               # TypeScript types
├── public/
│   └── manifest.json            # PWA manifest
└── supabase/
    ├── schema.sql               # Main database schema
    ├── invites-schema.sql       # Invite system tables
    ├── document-templates-schema.sql  # Template editor tables
    ├── migrations/              # Database migrations
    │   └── 20241207_expand_carriers.sql  # Extended carrier fields
    └── mock-data.sql            # Demo data for testing
```

> **Note:** The `(dashboard)` folder is a Next.js route group. It applies the dashboard layout but doesn't add `/dashboard` to the URL. So `/loads` (not `/dashboard/loads`) is the actual route.

---

## Database Schema

### Core Tables

| Table | Description |
|-------|-------------|
| `organizations` | Broker companies (multi-tenant support) |
| `users` | Broker employees (admin, broker, accountant) |
| `customers` | Shipper companies |
| `customer_users` | Customer portal users |
| `carriers` | Trucking companies |
| `drivers` | Individual drivers |
| `loads` | Shipments/freight |
| `documents` | Uploaded files (BOL, POD, etc.) |
| `document_templates` | Custom HTML templates for rate cons, BOLs, invoices |
| `location_history` | GPS tracking points |
| `status_history` | Load status changes |
| `invites` | Staff and customer invitation tokens |

### Load Status Flow

```
quoted → booked → dispatched → en_route_pickup → at_pickup → loaded → en_route_delivery → at_delivery → delivered → invoiced → paid
```

---

## Deployment

### Vercel (Recommended)

1. Push your code to GitHub
2. Import the repository in [Vercel](https://vercel.com)
3. Add environment variables:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `NEXT_PUBLIC_APP_URL` (your Vercel domain)
4. Deploy

### Environment Variables for Production

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# App
NEXT_PUBLIC_APP_URL=https://your-app.vercel.app
NEXT_PUBLIC_COMPANY_NAME=Your Company Name

# Email (Resend) - Required for email features
RESEND_API_KEY=re_xxxxxxxxxxxxx
EMAIL_FROM=noreply@yourdomain.com
```

### Setting Up Resend for Email

1. Create an account at [resend.com](https://resend.com)
2. Add and verify your domain (or use the free `onboarding@resend.dev` for testing)
3. Create an API key and add it to your environment variables
4. Update `EMAIL_FROM` to match your verified domain

---

## Customization

### Branding

- Update `public/manifest.json` for PWA name and colors
- Modify `tailwind.config.ts` for custom color palette
- Replace logos in customer portal layout

### Adding Equipment Types

Edit the equipment select options in:
- `src/app/(dashboard)/dashboard/loads/new/page.tsx`

### Extending Status Workflow

1. Add new status to `LoadStatus` type in `src/lib/types/database.ts`
2. Update the database enum in `supabase/schema.sql`
3. Add status badge styling in `src/components/dashboard/StatusBadge.tsx`

---

## API Reference

### POST /api/locations

Update driver GPS location.

```json
{
  "load_id": "uuid",
  "lat": 40.7128,
  "lng": -74.0060,
  "speed": 65,
  "heading": 180
}
```

### POST /api/documents/upload

Upload a document (multipart form data).

| Field | Type | Required |
|-------|------|----------|
| file | File | Yes |
| load_id | string | Yes |
| type | string | Yes (bol, pod, rate_con, invoice, other) |
| lat | number | No |
| lng | number | No |

### POST /api/documents/generate-pdf

Generate a PDF from an HTML template.

```json
{
  "html": "<html>...</html>",
  "options": {
    "format": "Letter",
    "landscape": false
  }
}
```

### POST /api/send-rate-con

Send a rate confirmation email to a carrier.

```json
{
  "load_id": "uuid",
  "carrier_email": "carrier@example.com",
  "pdf_url": "https://..."
}
```

### POST /api/request-custom-design

Request a custom template design (multipart form data).

| Field | Type | Required |
|-------|------|----------|
| message | string | Yes |
| logo | File | No |

---

## Template Variables

When creating document templates, use these placeholders:

### Load Information
| Variable | Description |
|----------|-------------|
| `{{load_number}}` | Load reference number |
| `{{pickup_date}}` | Pickup date |
| `{{delivery_date}}` | Delivery date |
| `{{pickup_time}}` | Pickup time window |
| `{{delivery_time}}` | Delivery time window |
| `{{equipment_type}}` | Required equipment |
| `{{commodity}}` | Freight description |
| `{{weight}}` | Load weight |
| `{{rate}}` | Carrier rate |

### Origin/Destination
| Variable | Description |
|----------|-------------|
| `{{origin_address}}` | Pickup street address |
| `{{origin_city}}` | Pickup city |
| `{{origin_state}}` | Pickup state |
| `{{destination_address}}` | Delivery street address |
| `{{destination_city}}` | Delivery city |
| `{{destination_state}}` | Delivery state |

### Carrier/Customer
| Variable | Description |
|----------|-------------|
| `{{carrier_name}}` | Carrier company name |
| `{{carrier_mc}}` | Carrier MC number |
| `{{customer_name}}` | Customer/shipper name |
| `{{broker_name}}` | Your company name |
| `{{broker_phone}}` | Your contact phone |
| `{{broker_email}}` | Your contact email |

---

## Third-Party Integrations

VectrLoadAI supports a modular integration layer for essential broker services. Each integration connects to existing modules (Loads, Carriers, Accounting).

### Integration Architecture

```
/lib/integrations/
├── core/
│   ├── types.ts          # Provider configs, shared types
│   ├── encryption.ts     # AES-256-GCM credential encryption
│   ├── logger.ts         # Sync logging utilities
│   ├── base-client.ts    # Abstract client classes with retry/error handling
│   └── index.ts
├── quickbooks/           # OAuth2 flow, customer/invoice sync
├── dat/                  # Rate lookups, load posting
├── truckstop/            # Rate lookups, load posting
├── highway/              # Carrier verification
├── macropoint/           # Tracking sessions
└── denim/                # Carrier payments
```

### Supported Integrations

| Provider | Category | Auth Type | Features |
|----------|----------|-----------|----------|
| **QuickBooks Online** | Accounting | OAuth2 | Sync customers to QBO, push invoices as QBO invoices, push carrier payments as bills, pull payment status |
| **DAT Load Board** | Load Boards | API Key | Search market rates by lane, post loads, pull rate history for margin calculations |
| **Truckstop** | Load Boards | API Key | Search market rates, post loads, aggregate rate data |
| **Highway** | Carrier Vetting | API Key | Auto-verify MC/DOT authority, insurance status, safety scores, flag expired/revoked carriers |
| **Macropoint** | Tracking | API Key | Request tracking by load, receive location webhooks, ETA updates |
| **Denim** | Payments | API Key | Initiate carrier payments, quick pay options, payment status webhooks |

### Database Tables for Integrations

| Table | Purpose |
|-------|---------|
| `organization_integrations` | OAuth tokens, API credentials per organization (encrypted) |
| `integration_sync_logs` | Detailed history of all sync operations |
| `rate_lookups` | DAT/Truckstop rate data for margin analysis |
| `carrier_verifications` | Highway verification results per carrier |
| `tracking_sessions` | Macropoint tracking sessions per load |
| `carrier_payments` | Denim payment records |

### Integration Environment Variables

```env
# QuickBooks (OAuth2)
QUICKBOOKS_CLIENT_ID=
QUICKBOOKS_CLIENT_SECRET=
QUICKBOOKS_REDIRECT_URI=https://your-app.com/api/integrations/quickbooks/callback

# Load Boards
DAT_API_KEY=
DAT_API_SECRET=
TRUCKSTOP_API_KEY=

# Carrier Vetting
HIGHWAY_API_KEY=

# Tracking
MACROPOINT_API_KEY=
MACROPOINT_WEBHOOK_SECRET=

# Payments
DENIM_API_KEY=
DENIM_WEBHOOK_SECRET=

# Security (32-byte hex key for AES-256-GCM)
INTEGRATION_ENCRYPTION_KEY=your-32-byte-hex-encryption-key
```

### Managing Integrations

1. Go to **Settings** > **Integrations**
2. Click **Connect** on any integration card
3. For OAuth providers (QuickBooks), you'll be redirected to authorize
4. For API key providers, enter your credentials in the dialog
5. Once connected, use **Sync** to manually trigger data sync
6. View sync history via **View Logs**

### Integration Usage Examples

```typescript
// QuickBooks - Push invoice to QBO
import { pushInvoiceToQuickBooks } from '@/lib/integrations/quickbooks'
await pushInvoiceToQuickBooks(integrationId, organizationId, invoiceId)

// DAT - Get market rate for a lane
import { getRateForLane } from '@/lib/integrations/dat'
const rate = await getRateForLane(organizationId,
  { city: 'Chicago', state: 'IL' },
  { city: 'Dallas', state: 'TX' },
  'van'
)

// Highway - Verify carrier authority and insurance
import { verifyCarrier } from '@/lib/integrations/highway'
const verification = await verifyCarrier(carrierId, organizationId)

// Macropoint - Start real-time tracking
import { startLoadTracking, getLoadLocation } from '@/lib/integrations/macropoint'
await startLoadTracking(loadId, organizationId)
const location = await getLoadLocation(loadId, organizationId)

// Denim - Create carrier payment
import { createCarrierPayment } from '@/lib/integrations/denim'
await createCarrierPayment(loadId, organizationId, {
  payment_method: 'ach',
  use_quickpay: true  // Enable QuickPay discount
})
```

### Webhooks

Configure webhook endpoints in your integration settings:

| Provider | Endpoint | Events |
|----------|----------|--------|
| Macropoint | `/api/webhooks/macropoint` | Location updates, ETA changes, geofence events |
| Denim | `/api/webhooks/denim` | Payment status updates, bank verification |

---

## Phase 2: AI Integration (Coming Soon)

The next major phase introduces AI capabilities to **increase margins** and **reduce admin time**.

### AI-Powered Features

#### 1. Smart Rate Suggestions
- Analyze historical rate data from DAT/Truckstop
- Lane-based pricing recommendations based on market trends
- Margin optimization suggestions (when to negotiate, when to accept)
- Predict market rate movements for better timing

#### 2. Automated Document Processing
- OCR extraction from BOLs, PODs, carrier invoices
- Auto-extract: load numbers, amounts, dates, addresses
- Automatically match documents to correct loads
- Flag discrepancies between documents and load data
- Reduce manual data entry by 80%+

#### 3. AI-Powered Carrier Matching
- Recommend best carriers for each lane based on:
  - Historical rates and reliability
  - Equipment availability
  - Current location
  - Safety scores and insurance status
- Predict carrier availability before reaching out
- Optimize carrier-load assignments for fleet utilization

#### 4. Invoice Automation
- Auto-generate invoices from delivered loads
- Smart document package assembly (invoice + BOL + POD)
- Automated factoring submission with audit trail
- Payment reminder scheduling based on customer history

#### 5. Load Optimization
- Suggest optimal routing for multi-stop loads
- Identify consolidation opportunities
- Minimize deadhead miles with backhaul suggestions
- Fuel cost optimization based on routes and fuel prices

#### 6. Communication Automation
- Auto-generate rate confirmations from load data
- Carrier booking confirmations with all required details
- Customer load updates at key milestones
- Tracking notification emails to stakeholders
- Smart email templates that learn your tone

#### 7. Anomaly Detection
- Flag unusual rate requests (too high/low for lane)
- Detect potential fraud patterns in documents
- Insurance expiration warnings before loads are booked
- Authority status alerts (carrier went inactive)
- Double-brokering risk detection

### AI Environment Variables

```env
# AI Providers (Phase 2)
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
```

---

## Security

### Row Level Security (RLS)

All tables have RLS policies ensuring:
- Brokers see only their organization's data
- Customers see only their loads
- Drivers see only their assigned loads
- Public tracking requires valid token

### Authentication

- Broker/Customer: Email + password
- Driver: Phone + OTP

### API Security

- Service role key used only server-side
- Anon key for client-side with RLS protection
- CORS configured for your domain only

---

## Roadmap

### Completed
- [x] Email notifications via Resend
- [x] Document template editor with PDF export
- [x] White glove template design service
- [x] Carrier onboarding with W9/factoring info
- [x] Team management with role-based permissions
- [x] Accounting module with invoice management
- [x] Document audit workflow for factoring
- [x] Integration framework with encryption

### Completed - Phase 1 Integrations
- [x] Integration settings UI and API routes
- [x] QuickBooks Online (OAuth2, customer/invoice sync)
- [x] DAT Load Board (market rates with 4-hour caching)
- [ ] Truckstop (market rates, load posting) - Similar to DAT
- [x] Highway (carrier vetting, insurance verification)
- [x] Macropoint (real-time GPS tracking, webhooks)
- [x] Denim (carrier payments, QuickPay, batch payments)

### Future - Phase 2 AI Integration
- [ ] Smart rate suggestions with margin optimization
- [ ] Automated document processing (OCR)
- [ ] AI-powered carrier matching
- [ ] Invoice automation
- [ ] Load optimization and routing
- [ ] Communication automation
- [ ] Anomaly detection and fraud prevention

### Future Enhancements
- [ ] SMS alerts for drivers
- [ ] Route optimization
- [ ] Fuel cost calculations
- [ ] Driver pay settlements
- [ ] Mobile app (React Native)
- [ ] EDI integration (204, 214, 210)

---

## Troubleshooting

### "Invalid Supabase URL" Error

Make sure your `.env.local` has a valid URL format:
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
```

### Maps Not Loading

- Check browser console for errors
- Ensure Leaflet CSS is imported
- The map requires client-side rendering (uses dynamic import with `ssr: false`)

### Driver GPS Not Updating

- Ensure HTTPS in production (required for geolocation)
- Check browser permissions for location access
- Verify the `/api/locations` endpoint is accessible

### Build Errors

```bash
# Clear cache and rebuild
rm -rf .next
npm run build
```

### Email Not Sending

- Verify `RESEND_API_KEY` is set in your environment
- Check that `EMAIL_FROM` matches a verified domain in Resend
- For local testing, use `onboarding@resend.dev` as the from address

### Carrier Creation Fails

Run the carrier migration to add all required columns:
1. Go to Supabase SQL Editor
2. Run the contents of `supabase/migrations/20241207_expand_carriers.sql`

---

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## License

This project is open source and available under the [MIT License](LICENSE).

---

## Acknowledgments

- [Next.js](https://nextjs.org/) - React framework
- [Supabase](https://supabase.com/) - Backend as a Service
- [shadcn/ui](https://ui.shadcn.com/) - UI components
- [Leaflet](https://leafletjs.com/) - Interactive maps
- [OpenStreetMap](https://www.openstreetmap.org/) - Map tiles
- [Tailwind CSS](https://tailwindcss.com/) - Styling
- [Lucide](https://lucide.dev/) - Icons
- [TipTap](https://tiptap.dev/) - Rich text editor
- [Resend](https://resend.com/) - Email API
- [Puppeteer](https://pptr.dev/) - PDF generation

---

**VectrLoadAI** - Intelligent Freight Management

Built with AI assistance to prove that the future of software development is accessible to everyone.
