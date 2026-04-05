# ServiMarket - Marketplace de Servicios

## Overview

Full-stack marketplace web app where service providers can publish their services and products, and clients can browse, discover, and chat with providers.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **Frontend**: React + Vite (artifacts/servicios), Tailwind CSS, shadcn/ui, Wouter routing
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)
- **Auth**: Cookie sessions with bcryptjs password hashing
- **Image upload**: Base64 to local filesystem

## Key Features

- User registration as **provider** or **client**
- Providers can create/edit/delete listings (services and products)
- Listings have: title, description, price, photo, WhatsApp contact, payment methods (cash/transfer/card)
- Public marketplace with listings by category and type filter
- Search functionality
- Internal messaging/chat between clients and providers
- Provider dashboard with stats

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/api-server run dev` — run API server locally

## DB Tables

- `users` — id, name, email, password_hash, role (provider|client), phone, avatar_url
- `categories` — id, name, icon, description
- `listings` — id, provider_id, category_id, title, description, type, price, image_url, whatsapp, payment_methods[], is_active
- `conversations` — id, client_id, provider_id, listing_id
- `messages` — id, conversation_id, sender_id, content, is_read

## Sample Data

- `maria@ejemplo.com` / `password123` — Provider (María García)
- `carlos@ejemplo.com` / `password123` — Provider (Carlos López)  
- `ana@ejemplo.com` / `password123` — Client (Ana Martínez)

## Architecture Notes

- Sessions use `cookie-session` with `SESSION_SECRET` env var
- Image uploads stored locally in `/uploads/` folder, served at `/api/uploads/:filename`
- All API routes under `/api/` prefix
- Frontend served at `/` (root)
