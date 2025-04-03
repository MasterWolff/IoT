'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function DataTables() {
  const [paintings, setPaintings] = useState<any[]>([]);
  const [devices, setDevices] = useState<any[]>([]);
  const [materials, setMaterials] = useState<any[]>([]);
  const [paintingMaterials, setPaintingMaterials] = useState<any[]>([]);
  const [environmentalData, setEnvironmentalData] = useState<any[]>([]);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [loading, setLoading] = useState<{ [key: string]: boolean }>({
    paintings: true,
    devices: true,
    materials: true,
    paintingMaterials: true,
    environmentalData: true,
    alerts: true
  });
  const [error, setError] = useState<{ [key: string]: string | null }>({
    paintings: null,
    devices: null,
    materials: null,
    paintingMaterials: null,
    environmentalData: null,
    alerts: null
  });

  useEffect(() => {
    async function fetchAllData() {
      // Fetch paintings
      try {
        const response = await fetch('/api/paintings');
        if (!response.ok) throw new Error(`Error: ${response.status}`);
        const data = await response.json();
        console.log('Paintings data:', data);
        setPaintings(data.paintings || []);
      } catch (err) {
        console.error('Error fetching paintings:', err);
        setError(prev => ({ ...prev, paintings: err instanceof Error ? err.message : 'Failed to fetch' }));
      } finally {
        setLoading(prev => ({ ...prev, paintings: false }));
      }

      // Fetch devices
      try {
        const response = await fetch('/api/devices');
        if (!response.ok) throw new Error(`Error: ${response.status}`);
        const data = await response.json();
        console.log('Devices data:', data);
        setDevices(data.devices || []);
      } catch (err) {
        console.error('Error fetching devices:', err);
        setError(prev => ({ ...prev, devices: err instanceof Error ? err.message : 'Failed to fetch' }));
      } finally {
        setLoading(prev => ({ ...prev, devices: false }));
      }

      // Fetch materials
      try {
        const response = await fetch('/api/materials');
        if (!response.ok) throw new Error(`Error: ${response.status}`);
        const data = await response.json();
        console.log('Materials data:', data);
        setMaterials(data.materials || []);
      } catch (err) {
        console.error('Error fetching materials:', err);
        setError(prev => ({ ...prev, materials: err instanceof Error ? err.message : 'Failed to fetch' }));
      } finally {
        setLoading(prev => ({ ...prev, materials: false }));
      }

      // Fetch painting_materials
      try {
        const response = await fetch('/api/painting-materials');
        if (!response.ok) throw new Error(`Error: ${response.status}`);
        const data = await response.json();
        console.log('Painting Materials data:', data);
        setPaintingMaterials(data.painting_materials || []);
      } catch (err) {
        console.error('Error fetching painting materials:', err);
        setError(prev => ({ ...prev, paintingMaterials: err instanceof Error ? err.message : 'Failed to fetch' }));
      } finally {
        setLoading(prev => ({ ...prev, paintingMaterials: false }));
      }

      // Fetch environmental data
      try {
        const response = await fetch('/api/environmental-data');
        if (!response.ok) throw new Error(`Error: ${response.status}`);
        const data = await response.json();
        console.log('Environmental data:', data);
        setEnvironmentalData(data.data || []);
      } catch (err) {
        console.error('Error fetching environmental data:', err);
        setError(prev => ({ ...prev, environmentalData: err instanceof Error ? err.message : 'Failed to fetch' }));
      } finally {
        setLoading(prev => ({ ...prev, environmentalData: false }));
      }

      // Fetch alerts
      try {
        const response = await fetch('/api/alerts');
        if (!response.ok) throw new Error(`Error: ${response.status}`);
        const data = await response.json();
        console.log('Alerts data:', data);
        setAlerts(data.alerts || []);
      } catch (err) {
        console.error('Error fetching alerts:', err);
        setError(prev => ({ ...prev, alerts: err instanceof Error ? err.message : 'Failed to fetch' }));
      } finally {
        setLoading(prev => ({ ...prev, alerts: false }));
      }
    }

    fetchAllData();
  }, []);

  return (
    <div className="container mx-auto p-4">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-4">Data Tables</h1>
        <p className="mb-4">View raw data from all API endpoints to verify database connectivity.</p>
        <div className="flex space-x-4">
          <Link href="/" className="text-blue-500 hover:underline">
            Back to Dashboard
          </Link>
          <Link href="/database-cleanup" className="text-red-500 hover:underline">
            Cleanup Database
          </Link>
        </div>
      </div>

      <div className="mb-6 flex gap-4">
        <button 
          onClick={async () => {
            try {
              const response = await fetch('/api/debug/add-test-data', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                  count: 5,
                  includeAlerts: true
                })
              });
              
              if (!response.ok) {
                throw new Error(`HTTP error ${response.status}`);
              }
              
              const result = await response.json();
              alert(`Added ${result.count || 0} test data points. Refresh to see the new data.`);
            } catch (error) {
              console.error('Error adding test data:', error);
              alert(`Error adding test data: ${error instanceof Error ? error.message : String(error)}`);
            }
          }}
          className="px-4 py-2 bg-orange-500 text-white font-medium rounded hover:bg-orange-600"
        >
          Add Test Data (Debug)
        </button>
        
        <button
          onClick={() => window.location.reload()}
          className="px-4 py-2 bg-blue-500 text-white font-medium rounded hover:bg-blue-600"
        >
          Refresh Data
        </button>
      </div>

      {/* Paintings Table */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold mb-2">Paintings</h2>
        <p className="text-sm text-gray-500 mb-2">API: /api/paintings</p>
        {loading.paintings ? (
          <p>Loading paintings...</p>
        ) : error.paintings ? (
          <p className="text-red-500">Error: {error.paintings}</p>
        ) : paintings.length > 0 ? (
          <div className="overflow-x-auto border rounded">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Artist</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created At</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {paintings.map((painting) => (
                  <tr key={painting.id}>
                    <td className="px-4 py-2 text-sm text-gray-500">{painting.id}</td>
                    <td className="px-4 py-2 text-sm text-gray-500">{painting.name}</td>
                    <td className="px-4 py-2 text-sm text-gray-500">{painting.artist}</td>
                    <td className="px-4 py-2 text-sm text-gray-500">{new Date(painting.created_at).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p>No paintings found</p>
        )}
      </div>

      {/* Devices Table */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold mb-2">Devices</h2>
        <p className="text-sm text-gray-500 mb-2">API: /api/devices</p>
        {loading.devices ? (
          <p>Loading devices...</p>
        ) : error.devices ? (
          <p className="text-red-500">Error: {error.devices}</p>
        ) : devices.length > 0 ? (
          <div className="overflow-x-auto border rounded">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Painting ID</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Last Measurement</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {devices.map((device) => (
                  <tr key={device.id}>
                    <td className="px-4 py-2 text-sm text-gray-500">{device.id}</td>
                    <td className="px-4 py-2 text-sm text-gray-500">{device.name}</td>
                    <td className="px-4 py-2 text-sm text-gray-500">{device.painting_id}</td>
                    <td className="px-4 py-2 text-sm text-gray-500">{device.status}</td>
                    <td className="px-4 py-2 text-sm text-gray-500">
                      {device.last_measurement ? new Date(device.last_measurement).toLocaleString() : 'N/A'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p>No devices found</p>
        )}
      </div>

      {/* Materials Table */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold mb-2">Materials</h2>
        <p className="text-sm text-gray-500 mb-2">API: /api/materials</p>
        {loading.materials ? (
          <p>Loading materials...</p>
        ) : error.materials ? (
          <p className="text-red-500">Error: {error.materials}</p>
        ) : materials.length > 0 ? (
          <div className="overflow-x-auto border rounded">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Temp Lower</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Temp Upper</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Humidity Lower</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Humidity Upper</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {materials.map((material) => (
                  <tr key={material.id}>
                    <td className="px-4 py-2 text-sm text-gray-500">{material.id}</td>
                    <td className="px-4 py-2 text-sm text-gray-500">{material.name}</td>
                    <td className="px-4 py-2 text-sm text-gray-500">{material.threshold_temperature_lower}</td>
                    <td className="px-4 py-2 text-sm text-gray-500">{material.threshold_temperature_upper}</td>
                    <td className="px-4 py-2 text-sm text-gray-500">{material.threshold_humidity_lower}</td>
                    <td className="px-4 py-2 text-sm text-gray-500">{material.threshold_humidity_upper}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p>No materials found</p>
        )}
      </div>

      {/* Painting Materials Table */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold mb-2">Painting Materials</h2>
        <p className="text-sm text-gray-500 mb-2">API: /api/painting-materials</p>
        {loading.paintingMaterials ? (
          <p>Loading painting materials...</p>
        ) : error.paintingMaterials ? (
          <p className="text-red-500">Error: {error.paintingMaterials}</p>
        ) : paintingMaterials.length > 0 ? (
          <div className="overflow-x-auto border rounded">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Painting ID</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Material ID</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created At</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {paintingMaterials.map((pm, index) => (
                  <tr key={pm.id || index}>
                    <td className="px-4 py-2 text-sm text-gray-500">{pm.id || 'N/A'}</td>
                    <td className="px-4 py-2 text-sm text-gray-500">{pm.painting_id}</td>
                    <td className="px-4 py-2 text-sm text-gray-500">{pm.material_id}</td>
                    <td className="px-4 py-2 text-sm text-gray-500">
                      {pm.created_at ? new Date(pm.created_at).toLocaleString() : 'N/A'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p>No painting materials found</p>
        )}
      </div>

      {/* Environmental Data Table */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold mb-2">Environmental Data</h2>
        <p className="text-sm text-gray-500 mb-2">API: /api/environmental-data</p>
        {loading.environmentalData ? (
          <p>Loading environmental data...</p>
        ) : error.environmentalData ? (
          <p className="text-red-500">Error: {error.environmentalData}</p>
        ) : environmentalData.length > 0 ? (
          <div className="overflow-x-auto border rounded">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Painting ID</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Device ID</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Timestamp</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Temperature</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Humidity</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Illuminance</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">CO2</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {environmentalData.map((data) => (
                  <tr key={data.id}>
                    <td className="px-4 py-2 text-sm text-gray-500">{data.id}</td>
                    <td className="px-4 py-2 text-sm text-gray-500">{data.painting_id}</td>
                    <td className="px-4 py-2 text-sm text-gray-500">{data.device_id}</td>
                    <td className="px-4 py-2 text-sm text-gray-500">
                      {data.timestamp ? new Date(data.timestamp).toLocaleString() : 'N/A'}
                    </td>
                    <td className="px-4 py-2 text-sm text-gray-500">{data.temperature !== null ? `${data.temperature}°C` : 'N/A'}</td>
                    <td className="px-4 py-2 text-sm text-gray-500">{data.humidity !== null ? `${data.humidity}%` : 'N/A'}</td>
                    <td className="px-4 py-2 text-sm text-gray-500">Not available</td>
                    <td className="px-4 py-2 text-sm text-gray-500">{data.co2concentration !== null ? `${data.co2concentration} ppm` : 'N/A'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p>No environmental data found</p>
        )}
      </div>

      {/* Alerts Table */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold mb-2">Alerts</h2>
        <p className="text-sm text-gray-500 mb-2">API: /api/alerts</p>
        {loading.alerts ? (
          <p>Loading alerts...</p>
        ) : error.alerts ? (
          <p className="text-red-500">Error: {error.alerts}</p>
        ) : alerts.length > 0 ? (
          <div className="overflow-x-auto border rounded">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Painting</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Measured Value</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Threshold</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Timestamp</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {alerts.map((alert) => (
                  <tr key={alert.id}>
                    <td className="px-4 py-2 text-sm text-gray-500">{alert.id}</td>
                    <td className="px-4 py-2 text-sm text-gray-500">{alert.alert_type}</td>
                    <td className="px-4 py-2 text-sm text-gray-500">{alert.paintings?.name || 'Unknown'}</td>
                    <td className="px-4 py-2 text-sm text-gray-500">{alert.measured_value}</td>
                    <td className="px-4 py-2 text-sm text-gray-500">
                      {alert.threshold_exceeded === 'upper' ? '>' : '<'} {alert.threshold_value}
                    </td>
                    <td className="px-4 py-2 text-sm text-gray-500">
                      {alert.timestamp ? new Date(alert.timestamp).toLocaleString() : 'N/A'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p>No alerts found</p>
        )}
      </div>
    </div>
  );
} 