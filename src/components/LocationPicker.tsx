import { useEffect, useRef, useState, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LocateFixed, MapPin, Search } from "lucide-react";
import { toast } from "sonner";

declare global {
  interface Window {
    google: any;
  }
}

export interface PickedLocation {
  lat: number;
  lng: number;
  address: string;
}

interface LocationPickerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialLat?: number | null;
  initialLng?: number | null;
  initialAddress?: string | null;
  onConfirm: (loc: PickedLocation) => void | Promise<void>;
  title?: string;
  description?: string;
}

const DEFAULT_CENTER = { lat: 10.8505, lng: 76.2711 }; // Kerala fallback

const waitForGoogle = (): Promise<void> =>
  new Promise((resolve, reject) => {
    if (window.google?.maps) return resolve();
    let tries = 0;
    const t = setInterval(() => {
      tries++;
      if (window.google?.maps) {
        clearInterval(t);
        resolve();
      } else if (tries > 80) {
        clearInterval(t);
        reject(new Error("Google Maps failed to load"));
      }
    }, 100);
  });

const LocationPicker = ({
  open,
  onOpenChange,
  initialLat,
  initialLng,
  initialAddress,
  onConfirm,
  title = "Pick your location",
  description = "Drag the marker, search a place, or use your current GPS location.",
}: LocationPickerProps) => {
  const mapDivRef = useRef<HTMLDivElement | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const mapRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const geocoderRef = useRef<any>(null);
  const autocompleteRef = useRef<any>(null);

  const [address, setAddress] = useState<string>(initialAddress || "");
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(
    initialLat && initialLng ? { lat: initialLat, lng: initialLng } : null
  );
  const [loadingMap, setLoadingMap] = useState(true);
  const [locating, setLocating] = useState(false);
  const [saving, setSaving] = useState(false);

  const reverseGeocode = useCallback((lat: number, lng: number) => {
    if (!geocoderRef.current) return;
    geocoderRef.current.geocode({ location: { lat, lng } }, (results: any[], status: string) => {
      if (status === "OK" && results?.[0]) {
        setAddress(results[0].formatted_address);
      }
    });
  }, []);

  const updateMarker = useCallback(
    (lat: number, lng: number, doGeocode = true) => {
      setCoords({ lat, lng });
      if (markerRef.current && mapRef.current) {
        const pos = { lat, lng };
        markerRef.current.setPosition(pos);
        mapRef.current.panTo(pos);
      }
      if (doGeocode) reverseGeocode(lat, lng);
    },
    [reverseGeocode]
  );

  // Initialize map when dialog opens
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoadingMap(true);

    waitForGoogle()
      .then(() => {
        if (cancelled || !mapDivRef.current) return;
        const start =
          initialLat && initialLng ? { lat: initialLat, lng: initialLng } : DEFAULT_CENTER;

        const map = new window.google.maps.Map(mapDivRef.current, {
          center: start,
          zoom: initialLat && initialLng ? 16 : 11,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: false,
        });
        const marker = new window.google.maps.Marker({
          position: start,
          map,
          draggable: true,
        });
        marker.addListener("dragend", () => {
          const p = marker.getPosition();
          if (p) updateMarker(p.lat(), p.lng());
        });
        map.addListener("click", (e: any) => {
          if (e.latLng) updateMarker(e.latLng.lat(), e.latLng.lng());
        });

        mapRef.current = map;
        markerRef.current = marker;
        geocoderRef.current = new window.google.maps.Geocoder();

        if (searchInputRef.current) {
          const ac = new window.google.maps.places.Autocomplete(searchInputRef.current, {
            fields: ["geometry", "formatted_address", "name"],
          });
          ac.bindTo("bounds", map);
          ac.addListener("place_changed", () => {
            const place = ac.getPlace();
            if (!place.geometry?.location) return;
            const lat = place.geometry.location.lat();
            const lng = place.geometry.location.lng();
            setAddress(place.formatted_address || place.name || "");
            updateMarker(lat, lng, false);
            map.setZoom(16);
          });
          autocompleteRef.current = ac;
        }

        setLoadingMap(false);
        // If we don't have an initial address but have coords, geocode it
        if (initialLat && initialLng && !initialAddress) {
          reverseGeocode(initialLat, initialLng);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setLoadingMap(false);
          toast.error("Could not load Google Maps. Check your connection.");
        }
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const handleUseGps = () => {
    if (!navigator.geolocation) {
      toast.error("Geolocation is not supported by your browser");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        if (mapRef.current) mapRef.current.setZoom(16);
        updateMarker(latitude, longitude);
        setLocating(false);
      },
      () => {
        setLocating(false);
        toast.error("Unable to get current location. Enable location access.");
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handleConfirm = async () => {
    if (!coords) {
      toast.error("Please select a location on the map");
      return;
    }
    if (!address.trim()) {
      toast.error("Address cannot be empty");
      return;
    }
    try {
      setSaving(true);
      await onConfirm({ lat: coords.lat, lng: coords.lng, address: address.trim() });
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" /> {title}
          </DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              ref={searchInputRef}
              placeholder="Search for a place, area, or landmark"
              className="pl-9"
            />
          </div>

          <div className="relative w-full h-[320px] rounded-md overflow-hidden border border-border bg-muted">
            <div ref={mapDivRef} className="absolute inset-0" />
            {loadingMap && (
              <div className="absolute inset-0 flex items-center justify-center text-sm text-muted-foreground">
                Loading map...
              </div>
            )}
          </div>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleUseGps}
            disabled={locating || loadingMap}
            className="w-full sm:w-auto"
          >
            <LocateFixed className="h-4 w-4 mr-2" />
            {locating ? "Getting location..." : "Use my current GPS location"}
          </Button>

          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Selected address</label>
            <Input
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Address will appear here. You can edit it."
            />
            {coords && (
              <p className="text-xs text-muted-foreground">
                Lat: {coords.lat.toFixed(6)}, Lng: {coords.lng.toFixed(6)}
              </p>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleConfirm} disabled={saving || loadingMap || !coords}>
            {saving ? "Saving..." : "Save Location"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default LocationPicker;
