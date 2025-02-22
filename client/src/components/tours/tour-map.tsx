import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { Patient } from '@shared/schema';
import { useQuery } from '@tanstack/react-query';
import L from 'leaflet';

// Fix for default markers
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

interface TourMapProps {
  patientIds: number[];
  className?: string;
}

export function TourMap({ patientIds, className }: TourMapProps) {
  const { data: patients = [] } = useQuery<Patient[]>({
    queryKey: ["/api/patients"],
  });

  const tourPatients = patients.filter(p => patientIds.includes(p.id));
  
  // Default center (can be adjusted based on actual patient locations)
  const center: [number, number] = [51.1657, 10.4515];

  return (
    <MapContainer
      center={center}
      zoom={13}
      className={className}
      style={{ height: '100%', width: '100%', borderRadius: '0.75rem' }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {tourPatients.map((patient) => (
        <Marker 
          key={patient.id} 
          position={[
            patient.coordinates?.lat || center[0],
            patient.coordinates?.lng || center[1]
          ]}
        >
          <Popup>
            <div className="p-2">
              <h3 className="font-medium">{patient.name}</h3>
              <p className="text-sm text-gray-600">{patient.address}</p>
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
