# Arduino Cloud Integration

This document explains how the automatic data fetching from Arduino Cloud works in this application.

## Overview

The system automatically fetches environmental sensor data from Arduino Cloud and stores it in the Supabase database. It also updates the device status based on the last measurement timestamp.

## How It Works

1. **Scheduled Data Fetching**: A cron job runs at regular intervals (configurable, default is every 5 minutes) to fetch data from all Arduino devices.

2. **Device Mapping**: The system maps devices in our database to Arduino Cloud devices using the `arduino_device_id` field.

3. **Thing ID Resolution**: For each device, the system resolves the Arduino Cloud Thing ID, which is required to fetch property values.

4. **Data Storage**: Fetched sensor data is stored in the `environmental_data` table.

5. **Status Tracking**: Each time data is fetched, the `last_measurement` timestamp in the `devices` table is updated.

6. **Device Status**: A device is considered "offline" if its `last_measurement` timestamp is older than a configurable threshold (default: 10 minutes).

## Configuration

### Environment Variables

- `ARDUINO_CLOUD_CLIENT_ID`: Your Arduino Cloud client ID
- `ARDUINO_CLOUD_CLIENT_SECRET`: Your Arduino Cloud client secret
- `CRON_SECRET`: Secret key for authenticating cron job requests
- `NEXT_PUBLIC_CRON_INTERVAL`: Interval in minutes for data fetching (default: 5)

### Database Schema

The `devices` table needs the following fields:
- `id`: Primary key
- `arduino_device_id`: ID of the device in Arduino Cloud
- `last_measurement`: Timestamp of the last successful measurement
- `painting_id`: Foreign key to the painting associated with the device

## API Endpoints

### Automatic Data Fetching

- `/api/cron/fetch-arduino-cloud?secret=YOUR_CRON_SECRET`: Endpoint for the cron job to fetch all device data

### Manual Data Fetching

- `/api/devices/[id]/fetch-data`: POST endpoint to manually fetch data for a specific device

### Arduino Cloud API

- `/api/arduino-cloud/devices`: GET endpoint to list all devices in Arduino Cloud
- `/api/arduino-cloud/device-properties?deviceId=XX&thingId=YY`: GET endpoint to fetch properties for a specific device

## Testing

You can test the Arduino Cloud integration on the `/arduino-test` page. This page shows:

1. A list of all Arduino Cloud devices
2. The current status of each device
3. The last measurement timestamp
4. The properties and their values for each device

## Troubleshooting

If data is not being fetched automatically:

1. Check the environment variables are set correctly
2. Ensure the Arduino Cloud credentials are valid
3. Verify that devices in the database have the correct `arduino_device_id` set
4. Check the logs for any errors in the cron job

## Implementation Details

The key components of this system are:

1. `src/app/api/cron/fetch-arduino-cloud/route.ts`: The cron job endpoint
2. `src/lib/arduinoCloud.ts`: The Arduino Cloud client library
3. `src/lib/utils.ts`: Contains the `getDeviceStatus` function
4. `src/app/arduino-test/page.tsx`: The test page for Arduino Cloud integration 