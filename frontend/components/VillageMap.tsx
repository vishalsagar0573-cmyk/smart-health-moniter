import { useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Info, MapPin } from "lucide-react";

interface VillageLocation {
  village_name: string;
  latitude: number;
  longitude: number;
  alert_level: string;
  report_date: string;
}

interface VillageMapProps {
  locations: VillageLocation[];
}

export const VillageMap = ({ locations }: VillageMapProps) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const [mapboxToken, setMapboxToken] = useState("");
  const [tokenSaved, setTokenSaved] = useState(false);

  useEffect(() => {
    const savedToken = localStorage.getItem("mapbox_token");
    if (savedToken) {
      setMapboxToken(savedToken);
      setTokenSaved(true);
    }
  }, []);

  useEffect(() => {
    if (!mapContainer.current || !tokenSaved || !mapboxToken) return;

    mapboxgl.accessToken = mapboxToken;

    try {
      map.current = new mapboxgl.Map({
        container: mapContainer.current,
        style: "mapbox://styles/mapbox/light-v11",
        center: [76.9558, 15.3173], // Karnataka, India
        zoom: 7,
      });

      map.current.addControl(new mapboxgl.NavigationControl(), "top-right");

      // Add markers for each village
      locations.forEach((location) => {
        if (!location.latitude || !location.longitude) return;

        const markerColor =
          location.alert_level === "high"
            ? "#ef4444"
            : location.alert_level === "moderate"
              ? "#f59e0b"
              : "#10b981";

        const popup = new mapboxgl.Popup({ offset: 25 }).setHTML(`
          <div style="padding: 8px; font-family: sans-serif;">
            <h3 style="font-weight: bold; margin-bottom: 4px; color: #1f2937;">${location.village_name}</h3>
            <p style="font-size: 12px; margin-bottom: 4px;">
              Risk: <span style="color: ${markerColor}; font-weight: bold;">
                ${location.alert_level.toUpperCase()}
              </span>
            </p>
            <p style="font-size: 11px; color: #6b7280;">
              Last report: ${new Date(location.report_date).toLocaleDateString()}
            </p>
          </div>
        `);

        new mapboxgl.Marker({ color: markerColor })
          .setLngLat([location.longitude, location.latitude])
          .setPopup(popup)
          .addTo(map.current!);
      });

      if (locations.length > 0) {
        const bounds = new mapboxgl.LngLatBounds();
        locations.forEach((loc) => {
          if (loc.latitude && loc.longitude) {
            bounds.extend([loc.longitude, loc.latitude]);
          }
        });
        map.current.fitBounds(bounds, { padding: 50 });
      }
    } catch (error) {
      console.error("Map initialization error:", error);
    }

    return () => {
      map.current?.remove();
    };
  }, [tokenSaved, mapboxToken, locations]);

  const handleSaveToken = () => {
    if (mapboxToken.trim()) {
      localStorage.setItem("mapbox_token", mapboxToken.trim());
      setTokenSaved(true);
    }
  };

  if (!tokenSaved) {
    return (
      <div className="p-6 bg-white/50 dark:bg-gray-800/50 rounded-xl space-y-4">
        <Alert className="bg-blue-50 border-blue-100 text-blue-800">
          <Info className="h-4 w-4" />
          <AlertDescription>
            To display the map, you need a Mapbox public access token. Get yours free at{" "}
            <a
              href="https://mapbox.com"
              target="_blank"
              rel="noopener noreferrer"
              className="underline font-bold"
            >
              mapbox.com
            </a>
          </AlertDescription>
        </Alert>

        <div className="space-y-2">
          <Label htmlFor="mapbox-token">Mapbox Public Access Token</Label>
          <div className="flex gap-2">
            <Input
              id="mapbox-token"
              type="text"
              placeholder="pk.eyJ1..."
              value={mapboxToken}
              onChange={(e) => setMapboxToken(e.target.value)}
              className="bg-white"
            />
            <Button onClick={handleSaveToken} disabled={!mapboxToken.trim()}>
              Save & Load
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full w-full flex flex-col">
      <div ref={mapContainer} className="flex-1 w-full min-h-[350px] rounded-lg overflow-hidden" />
      <div className="p-4 bg-white/80 backdrop-blur-sm border-t absolute bottom-0 left-0 right-0 z-10 flex gap-6 text-sm">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-[#10b981] shadow-sm"></div>
          <span className="font-medium text-gray-700">Safe</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-[#f59e0b] shadow-sm"></div>
          <span className="font-medium text-gray-700">Moderate Risk</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-[#ef4444] shadow-sm"></div>
          <span className="font-medium text-gray-700">High Risk</span>
        </div>
      </div>
    </div>
  );
};
