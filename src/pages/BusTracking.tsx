import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import { Icon, LatLngExpression } from 'leaflet';
import { Bus, Navigation, Clock, MapPin, RefreshCw } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import 'leaflet/dist/leaflet.css';

interface BusData {
  id: string;
  busNumber: string;
  route: string;
  currentLocation: { lat: number; lng: number };
  status: 'MOVING' | 'STOPPED';
  eta: string;
  driver: string;
}

const campusCenter: LatLngExpression = [12.9716, 77.5946];

const createBusIcon = (status: 'MOVING' | 'STOPPED') => new Icon({
  iconUrl: `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="${status === 'MOVING' ? '#22c55e' : '#f59e0b'}" width="32" height="32"><rect x="3" y="4" width="18" height="14" rx="2" fill="${status === 'MOVING' ? '#22c55e' : '#f59e0b'}"/><circle cx="7" cy="18" r="2" fill="#333"/><circle cx="17" cy="18" r="2" fill="#333"/></svg>`)}`,
  iconSize: [32, 32],
  iconAnchor: [16, 32],
  popupAnchor: [0, -32],
});

function MapUpdater({ selectedBus }: { selectedBus: BusData | null }) {
  const map = useMap();
  useEffect(() => { if (selectedBus) map.flyTo([selectedBus.currentLocation.lat, selectedBus.currentLocation.lng], 16); }, [selectedBus, map]);
  return null;
}

export default function BusTracking() {
  const [buses, setBuses] = useState<BusData[]>([]);
  const [selectedBus, setSelectedBus] = useState<BusData | null>(null);

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'buses'), (snapshot) => {
      setBuses(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as BusData)));
    });
    return () => unsubscribe();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between"><div><h1 className="text-2xl font-bold text-foreground">Bus Tracking</h1><p className="text-muted-foreground">Real-time location of campus buses</p></div></div>
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2 overflow-hidden"><CardContent className="p-0"><div className="h-[400px] lg:h-[500px]"><MapContainer center={campusCenter} zoom={15} className="h-full w-full"><TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" /><MapUpdater selectedBus={selectedBus} />{buses.map((bus) => (<Marker key={bus.id} position={[bus.currentLocation.lat, bus.currentLocation.lng]} icon={createBusIcon(bus.status)}><Popup><strong>{bus.busNumber}</strong><p>{bus.route}</p></Popup></Marker>))}</MapContainer></div></CardContent></Card>
        <div className="space-y-4"><h2 className="font-semibold text-foreground">Available Buses</h2><div className="space-y-3">{buses.map((bus) => (<Card key={bus.id} className={`cursor-pointer ${selectedBus?.id === bus.id ? 'ring-2 ring-primary' : ''}`} onClick={() => setSelectedBus(bus)}><CardContent className="pt-4"><div className="flex justify-between"><div><h3 className="font-semibold">{bus.busNumber}</h3><p className="text-xs text-muted-foreground">{bus.route}</p></div><Badge>{bus.status}</Badge></div></CardContent></Card>))}</div></div>
      </div>
    </div>
  );
}