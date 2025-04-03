# IoT Museum Environmental Monitoring Dashboard

A Next.js application for monitoring environmental conditions of artwork in museums using IoT devices. The dashboard provides real-time data visualization for temperature, humidity, light, and CO2 levels to ensure proper conservation of valuable paintings.

## Features

- Dashboard with key statistics and active alerts
- Paintings management for tracking artwork
- Devices management for IoT sensors
- Materials tracking with environmental thresholds
- Environmental data visualization with interactive tabs

## Tech Stack

- [Next.js](https://nextjs.org) - React framework
- [Tailwind CSS](https://tailwindcss.com) - Utility-first CSS framework
- [Shadcn UI](https://ui.shadcn.com) - Component library
- [Supabase](https://supabase.com) - Backend and database

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Database Schema

The application uses the following database tables:
- `paintings` - Stores information about artworks
- `materials` - Contains data about painting materials and their environmental thresholds
- `painting_materials` - Junction table for the many-to-many relationship
- `devices` - Information about IoT sensors
- `environmental_data` - Sensor readings with timestamps

## Deployment

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new) from the creators of Next.js.

Check out [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
