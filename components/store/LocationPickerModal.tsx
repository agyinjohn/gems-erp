'use client';
import { useEffect, useRef, useState } from 'react';
import { X, MapPin, Loader2, Navigation } from 'lucide-react';

interface Props {
  initial?: string;
  onConfirm: (address: string) => void;
  onClose: () => void;
}

const MAPS_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY || '';

// Default center — Accra, Ghana (fallback if no GPS)
const DEFAULT_CENTER = { lat: 5.6037, lng: -0.187 };

declare global {
  interface Window {
    google: any;
    __mapsLoaded?: boolean;
    __mapsCallbacks?: Array<() => void>;
  }
}

function loadGoogleMaps(callback: () => void) {
  if (window.__mapsLoaded) { callback(); return; }
  if (!window.__mapsCallbacks) window.__mapsCallbacks = [];
  window.__mapsCallbacks.push(callback);
  if (document.getElementById('gmap-script')) return;
  const script = document.createElement('script');
  script.id = 'gmap-script';
  script.src = `https://maps.googleapis.com/maps/api/js?key=${MAPS_KEY}&libraries=places`;
  script.async = true;
  script.defer = true;
  script.onload = () => {
    window.__mapsLoaded = true;
    window.__mapsCallbacks?.forEach(cb => cb());
    window.__mapsCallbacks = [];
  };
  document.head.appendChild(script);
}

async function reverseGeocode(lat: number, lng: number): Promise<string> {
  return new Promise((resolve) => {
    const geocoder = new window.google.maps.Geocoder();
    geocoder.geocode({ location: { lat, lng } }, (results: any[], status: string) => {
      if (status === 'OK' && results[0]) {
        resolve(results[0].formatted_address);
      } else {
        resolve(`${lat.toFixed(5)}, ${lng.toFixed(5)}`);
      }
    });
  });
}

export default function LocationPickerModal({ initial, onConfirm, onClose }: Props) {
  const mapRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const autocompleteRef = useRef<any>(null);

  const [address, setAddress] = useState(initial || '');
  const [detecting, setDetecting] = useState(false);
  const [mapsReady, setMapsReady] = useState(false);
  const [error, setError] = useState('');

  // Load Google Maps SDK
  useEffect(() => {
    if (!MAPS_KEY) { setMapsReady(false); return; }
    loadGoogleMaps(() => setMapsReady(true));
  }, []);

  // Init map once SDK is ready
  useEffect(() => {
    if (!mapsReady || !mapRef.current) return;

    const map = new window.google.maps.Map(mapRef.current, {
      center: DEFAULT_CENTER,
      zoom: 13,
      disableDefaultUI: true,
      zoomControl: true,
      clickableIcons: false,
      styles: [{ featureType: 'poi', stylers: [{ visibility: 'off' }] }],
    });

    const marker = new window.google.maps.Marker({
      position: DEFAULT_CENTER,
      map,
      draggable: true,
      title: 'Drag to set location',
      icon: {
        path: window.google.maps.SymbolPath.CIRCLE,
        scale: 10,
        fillColor: '#0D3B6E',
        fillOpacity: 1,
        strokeColor: '#fff',
        strokeWeight: 2,
      },
    });

    // Drag end — reverse geocode new position
    marker.addListener('dragend', async () => {
      const pos = marker.getPosition();
      const addr = await reverseGeocode(pos.lat(), pos.lng());
      setAddress(addr);
    });

    // Click on map — move marker
    map.addListener('click', async (e: any) => {
      marker.setPosition(e.latLng);
      const addr = await reverseGeocode(e.latLng.lat(), e.latLng.lng());
      setAddress(addr);
    });

    mapInstanceRef.current = map;
    markerRef.current = marker;

    // Places Autocomplete on search input
    if (searchRef.current) {
      const ac = new window.google.maps.places.Autocomplete(searchRef.current, {
        fields: ['formatted_address', 'geometry'],
      });
      ac.addListener('place_changed', () => {
        const place = ac.getPlace();
        if (!place.geometry?.location) return;
        const loc = place.geometry.location;
        map.panTo(loc);
        map.setZoom(16);
        marker.setPosition(loc);
        setAddress(place.formatted_address || searchRef.current?.value || '');
      });
      autocompleteRef.current = ac;
    }

    // If initial address provided, geocode it to center map
    if (initial) {
      const geocoder = new window.google.maps.Geocoder();
      geocoder.geocode({ address: initial }, (results: any[], status: string) => {
        if (status === 'OK' && results[0]) {
          const loc = results[0].geometry.location;
          map.panTo(loc);
          map.setZoom(15);
          marker.setPosition(loc);
        }
      });
    }
  }, [mapsReady]);

  const detectLocation = () => {
    if (!navigator.geolocation) { setError('Geolocation not supported by your browser.'); return; }
    setDetecting(true);
    setError('');
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude: lat, longitude: lng } = pos.coords;
        const latlng = { lat, lng };
        if (mapInstanceRef.current) {
          mapInstanceRef.current.panTo(latlng);
          mapInstanceRef.current.setZoom(16);
        }
        if (markerRef.current) markerRef.current.setPosition(latlng);
        const addr = mapsReady
          ? await reverseGeocode(lat, lng)
          : `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
        setAddress(addr);
        setDetecting(false);
      },
      () => { setError('Could not get your location. Please search manually.'); setDetecting(false); }
    );
  };

  const confirm = () => {
    if (!address.trim()) return;
    onConfirm(address.trim());
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white w-full sm:max-w-lg sm:rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">

        {/* Header */}
        <div className="bg-[#0D3B6E] px-5 py-4 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <MapPin className="w-5 h-5 text-amber-300" />
            <h2 className="font-bold text-white text-base">Set Delivery Location</h2>
          </div>
          <button onClick={onClose} className="text-white/60 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search bar */}
        <div className="px-4 pt-4 pb-2 flex-shrink-0 space-y-2">
          <div className="relative">
            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              ref={searchRef}
              type="text"
              className="w-full border border-gray-200 rounded-xl pl-9 pr-4 py-2.5 text-sm focus:outline-none focus:border-[#0D3B6E] transition-colors"
              placeholder={mapsReady ? 'Search for a location…' : 'Enter your delivery address…'}
              defaultValue={initial}
              onChange={e => { if (!mapsReady) setAddress(e.target.value); }}
            />
          </div>

          <button
            onClick={detectLocation}
            disabled={detecting}
            className="w-full flex items-center justify-center gap-2 border border-dashed border-[#0D3B6E]/40 hover:border-[#0D3B6E] text-[#0D3B6E] text-sm font-semibold py-2.5 rounded-xl transition-all disabled:opacity-50"
          >
            {detecting
              ? <><Loader2 className="w-4 h-4 animate-spin" /> Detecting…</>
              : <><Navigation className="w-4 h-4" /> Use my current location</>
            }
          </button>

          {error && <p className="text-xs text-red-500">{error}</p>}
        </div>

        {/* Map */}
        {MAPS_KEY ? (
          <div className="flex-1 min-h-[280px] relative mx-4 mb-2 rounded-xl overflow-hidden border border-gray-200">
            <div ref={mapRef} className="w-full h-full min-h-[280px]" />
            {!mapsReady && (
              <div className="absolute inset-0 flex items-center justify-center bg-gray-50">
                <Loader2 className="w-6 h-6 animate-spin text-[#0D3B6E]" />
              </div>
            )}
            {mapsReady && (
              <div className="absolute bottom-2 left-1/2 -translate-x-1/2 bg-white/90 backdrop-blur-sm text-xs text-gray-500 px-3 py-1 rounded-full shadow">
                Drag pin or click map to adjust
              </div>
            )}
          </div>
        ) : (
          <div className="mx-4 mb-2 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-xs text-amber-800">
            Map preview unavailable — add <strong>NEXT_PUBLIC_GOOGLE_MAPS_KEY</strong> to enable it.
          </div>
        )}

        {/* Selected address + confirm */}
        <div className="px-4 pb-4 flex-shrink-0 space-y-3 pb-[max(1rem,env(safe-area-inset-bottom))]">
          {address && (
            <div className="flex items-start gap-2 bg-blue-50 border border-blue-100 rounded-xl px-3 py-2.5">
              <MapPin className="w-4 h-4 text-[#0D3B6E] flex-shrink-0 mt-0.5" />
              <p className="text-sm text-gray-800 leading-snug">{address}</p>
            </div>
          )}
          <div className="flex gap-2">
            {initial && (
              <button
                onClick={() => { onConfirm(''); }}
                className="flex-1 border border-gray-200 text-gray-500 hover:bg-gray-50 text-sm font-medium py-3 rounded-xl transition-colors"
              >
                Clear
              </button>
            )}
            <button
              onClick={confirm}
              disabled={!address.trim()}
              className="flex-1 bg-[#0D3B6E] hover:bg-[#1A5294] disabled:opacity-40 text-white font-bold text-sm py-3 rounded-xl transition-colors"
            >
              Confirm Location
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
