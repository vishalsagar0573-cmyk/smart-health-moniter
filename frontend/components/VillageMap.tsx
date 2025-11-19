import { useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
        style: "mapbox://styles/mapbox/streets-v12",
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
            : "#22c55e";

        const popup = new mapboxgl.Popup({ offset: 25 }).setHTML(`
          <div style="padding: 8px;">
            <h3 style="font-weight: bold; margin-bottom: 4px;">${location.village_name}</h3>
            <p style="font-size: 12px; margin-bottom: 4px;">
              Risk: <span style="color: ${markerColor}; font-weight: bold;">
                ${location.alert_level.toUpperCase()}
              </span>
            </p>
            <p style="font-size: 11px; color: #666;">
              Last report: ${new Date(location.report_date).toLocaleDateString()}
            </p>
          </div>
        `);

        new mapboxgl.Marker({ color: markerColor })
          .setLngLat([location.longitude, location.latitude])
          .setPopup(popup)
          .addTo(map.current!);
      });

      // Fit bounds to show all markers
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
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Village Location Map
          </CardTitle>
          <CardDescription>Configure Mapbox to view village locations</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              To display the map, you need a Mapbox public access token. Get yours free at{" "}
              <a
                href="https://mapbox.com"
                target="_blank"
                rel="noopener noreferrer"
                className="underline text-primary"
              >
                mapbox.com
              </a>
            </AlertDescription>
          </Alert>

          <div className="space-y-2">
            <Label htmlFor="mapbox-token">Mapbox Public Access Token</Label>
            <Input
              id="mapbox-token"
              type="text"
              placeholder="pk.eyJ1..."
              value={mapboxToken}
              onChange={(e) => setMapboxToken(e.target.value)}
            />
          </div>

          <Button onClick={handleSaveToken} disabled={!mapboxToken.trim()}>
            Save & Load Map
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MapPin className="h-5 w-5" />
          Village Locations ({locations.filter((l) => l.latitude && l.longitude).length})
        </CardTitle>
        <CardDescription>Interactive map showing village locations and risk levels</CardDescription>
      </CardHeader>
      <CardContent>
        <div ref={mapContainer} className="w-full h-[500px] rounded-lg" />
        <div className="mt-4 flex gap-4 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-success"></div>
            <span>Safe</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-warning"></div>
            <span>Moderate Risk</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-destructive"></div>
            <span>High Risk</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
