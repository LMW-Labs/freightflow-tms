# FreightFlow - A KHCL TMS

A modern, full-featured Transportation Management System (TMS) for freight brokers. Built by KHCL with Next.js 14, Supabase, and Tailwind CSS.

## Features

### Broker Dashboard
- **Load Management**: Create, edit, and track shipments through their entire lifecycle
- **Customer Management**: Maintain customer profiles with portal access
- **Carrier Management**: Track carriers with MC/DOT numbers and contact info
- **Live GPS Tracking**: Real-time map view of all active loads
- **Document Management**: Store and organize BOLs, PODs, rate confirmations, and invoices
- **Status Workflow**: Full load lifecycle from quote to payment

### Customer Portal
- **Auto-generated portals**: Each customer gets their own portal at `/portal/[company-slug]`
- **Load visibility**: Customers see only their loads
- **Real-time tracking**: Live GPS updates on shipments
- **Document access**: Download PODs and other documents
- **Branded experience**: Customizable per customer

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

## Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | Next.js 14 (App Router) |
| Database | Supabase (PostgreSQL) |
| Auth | Supabase Auth |
| Storage | Supabase Storage |
| Realtime | Supabase Realtime |
| Styling | Tailwind CSS + shadcn/ui |
| Maps | Leaflet + OpenStreetMap (free) |
| Hosting | Vercel |

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
│   │   ├── (auth)/              # Auth pages (login)
│   │   ├── (dashboard)/         # Broker dashboard
│   │   │   ├── dashboard/
│   │   │   │   ├── loads/       # Load management
│   │   │   │   ├── customers/   # Customer management
│   │   │   │   ├── carriers/    # Carrier management
│   │   │   │   └── tracking/    # Live tracking map
│   │   ├── api/                 # API routes
│   │   │   ├── locations/       # GPS updates
│   │   │   └── documents/       # File uploads
│   │   ├── driver/              # Driver PWA
│   │   ├── portal/              # Customer portal
│   │   │   └── [slug]/          # Dynamic customer routes
│   │   └── track/               # Public tracking
│   │       └── [token]/         # Token-based access
│   ├── components/
│   │   ├── dashboard/           # Dashboard components
│   │   ├── maps/                # Map components
│   │   └── ui/                  # shadcn/ui components
│   └── lib/
│       ├── supabase/            # Supabase clients
│       └── types/               # TypeScript types
├── public/
│   └── manifest.json            # PWA manifest
└── supabase/
    └── schema.sql               # Database schema
```

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
| `location_history` | GPS tracking points |
| `status_history` | Load status changes |

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
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
NEXT_PUBLIC_APP_URL=https://your-app.vercel.app
```

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

Future enhancements to consider:

- [ ] Email notifications (load updates, POD available)
- [ ] SMS alerts for drivers
- [ ] Invoice generation and PDF export
- [ ] QuickBooks integration
- [ ] Load board API integrations (DAT, Truckstop)
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

---

**FreightFlow** is a KHCL proprietary product.

Built with AI assistance to prove that the future of software development is accessible to everyone.
