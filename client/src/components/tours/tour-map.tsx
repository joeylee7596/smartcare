import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { Patient, Tour } from '@shared/schema';
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
  selectedEmployeeId?: number | null;
}

export function TourMap({ patientIds, className, selectedEmployeeId }: TourMapProps) {
  const { data: patients = [] } = useQuery<Patient[]>({
    queryKey: ["/api/patients"],
  });

  const { data: tours = [] } = useQuery<Tour[]>({
    queryKey: ["/api/tours"],
  });

  // Filter patients based on selectedEmployeeId
  const displayPatients = selectedEmployeeId 
    ? tours
        .filter(tour => tour.employeeId === selectedEmployeeId)
        .flatMap(tour => tour.patientIds)
        .map(id => patients.find(p => p.id === id))
        .filter((p): p is Patient => p !== undefined)
    : patients.filter(p => patientIds.includes(p.id));

  // Calculate map center based on patient coordinates
  const patientCoordinates = displayPatients.map(p => ({
    lat: parseFloat(p.address.split(',')[0]) || 51.1657,
    lng: parseFloat(p.address.split(',')[1]) || 10.4515
  }));

  const center = patientCoordinates.length > 0
    ? {
        lat: patientCoordinates.reduce((sum, coord) => sum + coord.lat, 0) / patientCoordinates.length,
        lng: patientCoordinates.reduce((sum, coord) => sum + coord.lng, 0) / patientCoordinates.length
      }
    : { lat: 51.1657, lng: 10.4515 }; // Default center (Germany)

  return (
    <MapContainer
      center={[center.lat, center.lng]}
      zoom={13}
      className={className}
      style={{ height: '100%', width: '100%', borderRadius: '0.75rem' }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {displayPatients.map((patient) => {
        const [lat, lng] = patient.address.split(',').map(parseFloat);
        return (
          <Marker 
            key={patient.id} 
            position={[
              lat || center.lat,
              lng || center.lng
            ]}
          >
            <Popup>
              <div className="p-2">
                <h3 className="font-medium">{patient.name}</h3>
                <p className="text-sm text-gray-600">{patient.address}</p>
              </div>
            </Popup>
          </Marker>
        );
      })}
    </MapContainer>
  );
}