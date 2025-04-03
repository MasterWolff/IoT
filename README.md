# IoT Painting Monitoring System

This project is an IoT system for monitoring environmental conditions around valuable paintings. It uses Arduino sensors to collect temperature, humidity, air pressure, CO2 levels, and mold risk data, and provides a dashboard for visualization and alerts.

## Features

- **Dashboard**: Overview of all paintings, active devices, alerts, and data points
- **Paintings Management**: Add, edit, and delete paintings with their details
- **Device Management**: Connect Arduino devices to specific paintings
- **Environmental Monitoring**: Real-time data visualization of environmental conditions
- **Alerts System**: Automatic alerts when environmental conditions exceed thresholds
- **Arduino Cloud Integration**: Fetch data from Arduino Cloud API to monitor paintings

## Arduino Monitoring

The system includes a dedicated Arduino Monitoring page that allows you to:

1. Select a device connected to a painting
2. Set a monitoring duration (1-120 minutes)
3. Fetch environmental data from Arduino Cloud every 5 seconds
4. View real-time readings and monitoring logs

### Setting up Arduino Cloud Integration

1. Create an account on [Arduino Cloud](https://cloud.arduino.cc/)
2. Set up your Arduino device with the required sensors
3. Create a "Thing" in Arduino Cloud with the following variables:
   - temperature
   - humidity
   - airPressure (or airpressure)
   - co2Concentration (or co2concentration)
   - moldRiskLevel (or moldrisklevel)
4. Create API credentials in Arduino Cloud (Client ID and Client Secret)
5. Add these credentials to your .env file:
   ```
   ARDUINO_CLIENT_ID=your-arduino-client-id
   ARDUINO_CLIENT_SECRET=your-arduino-client-secret
   ```

## Getting Started

1. Clone the repository
2. Copy `.env.example` to `.env` and fill in the required environment variables
3. Install dependencies: `npm install`
4. Start the development server: `npm run dev`
5. Visit `http://localhost:3000`

## Database Setup

The system uses Supabase as the database. You'll need to set up the following tables:

- paintings
- devices
- environmental_data
- materials
- alerts

See the database schema in `schema.sql` for details.

## Technologies

- Next.js
- React
- TypeScript
- Supabase
- shadcn/ui Components
- Arduino Cloud API
