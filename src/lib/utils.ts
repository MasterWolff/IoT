import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Calculate the status of a device based on its last measurement
 * @param lastMeasurementTimestamp Timestamp of the last measurement
 * @param inactiveThresholdMinutes Time in minutes after which a device is considered inactive
 * @returns 'online' | 'offline' | 'unknown'
 */
export function getDeviceStatus(
  lastMeasurementTimestamp: string | null, 
  inactiveThresholdMinutes: number = 10
): 'online' | 'offline' | 'unknown' {
  if (!lastMeasurementTimestamp) {
    return 'unknown';
  }
  
  const now = new Date();
  const lastMeasurement = new Date(lastMeasurementTimestamp);
  const diffMs = now.getTime() - lastMeasurement.getTime();
  const diffMinutes = diffMs / (1000 * 60);
  
  if (diffMinutes > inactiveThresholdMinutes) {
    return 'offline';
  }
  
  return 'online';
}
