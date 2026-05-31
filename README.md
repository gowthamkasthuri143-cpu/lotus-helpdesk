# Lotus Hospital IT Helpdesk

Live-ready hospital IT complaint / ticket management system.

## Features

- User ID + password login; no email login
- Admin, user, technician roles
- Admin can create users
- Admin can create/edit departments
- User can raise ticket
- Photo / screenshot / PDF upload
- Admin can assign technician and update status
- Technician can update assigned ticket status
- Calendar date-wise complaints
- Supabase database + storage
- Vercel-ready Next.js app

## Free setup

- Hosting: Vercel free
- Database + storage: Supabase free
- Free domain example: `lotushelpdesk.vercel.app`

## 1. Supabase setup

1. Create a Supabase project.
2. Open Supabase SQL Editor.
3. Copy and run `supabase/schema.sql`.
4. Open Project Settings -> API.
5. Copy Project URL and Service Role key.

## 2. Local env setup

Rename `.env.example` to `.env.local` and fill values:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
JWT_SECRET=change-this-long-random-secret
SETUP_SECRET=change-this-setup-secret
ADMIN_USER_ID=admin
ADMIN_PASSWORD=admin123
ADMIN_NAME=IT Admin
```

## 3. Install and run

```bash
npm install
npm run dev
```

Open:

```text
http://localhost:3000
```

## 4. Create first admin

After running locally or deploying to Vercel, call setup once:

```bash
curl -X POST http://localhost:3000/api/setup \
  -H "x-setup-secret: change-this-setup-secret"
```

For Vercel live URL:

```bash
curl -X POST https://lotushelpdesk.vercel.app/api/setup \
  -H "x-setup-secret: change-this-setup-secret"
```

Default admin login:

```text
User ID: admin
Password: admin123
```

## 5. Vercel deploy

1. Push this project to GitHub.
2. Import project in Vercel.
3. Add environment variables from `.env.local` into Vercel Project Settings -> Environment Variables.
4. Deploy.
5. Set project name as `lotushelpdesk` if available.

## Notes

- Demo tickets are not included.
- Live database starts empty.
- Only default admin is created by setup route.
- Passwords are stored as bcrypt hashes, not plain text.
- Service Role key is used only on server API routes. Do not expose it in browser code.
