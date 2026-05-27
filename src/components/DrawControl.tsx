"use client";

import { useEffect, useRef } from "react";
import { useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet-draw";
import { useMeshStore } from "@/lib/store";

/**
 * DrawControl — Leaflet-draw rectangle tool integration for react-leaflet.
 *
 * Blueprint §5 (Screen 1 — Query mode), §7 (Phase 2), G8 (serialize bbox to URL)
 *
 * Uses `useMap()` to access the Leaflet map instance, then adds a
 * `L.Control.Draw` handler restricted to rectangle-only.
 *
 * On `draw:created`, captures the rectangle bounds as { sw, ne } and
 * stores them in Zustand via `setBoundingBox`.
 *
 * On `draw:drawstart`, removes the previous rectangle layer (only one
 * bounding box allowed at a time).
 *
 * [GAP] Exact react-leaflet v5 integration pattern for leaflet-draw not
 * specified in blueprint — standard useMap() + useEffect pattern inferred.
 */

// Delete default draw icon references to avoid 404s from webpack bundling.
// The draw toolbar will render without icons (text-only fallback).
delete (L.Draw.Polyline.prototype as unknown as Record<string, unknown>)
  .initialize;

export default function DrawControl() {
  const map = useMap();
  const setBoundingBox = useMeshStore((s) => s.setBoundingBox);
  const drawnLayerRef = useRef<L.Rectangle | null>(null);
  const drawControlRef = useRef<L.Control.Draw | null>(null);

  useEffect(() => {
    if (!map) return;

    // ── Configure draw handlers — rectangle only ─────────────────────
    const drawOptions: L.Control.DrawConstructorOptions = {
      position: "topright",
      draw: {
        // Disable all shape types except rectangle
        polyline: false,
        polygon: false,
        circle: false,
        circlemarker: false,
        marker: false,
        rectangle: {
          shapeOptions: {
            color: "#6366f1", // indigo-500
            weight: 2,
            opacity: 0.8,
            fillOpacity: 0.15,
            fillColor: "#6366f1",
          },
          showArea: false,
          metric: false,
        },
      },
      edit: {
        featureGroup: new L.FeatureGroup(),
        remove: false,
        edit: false,
      },
    };

    const drawControl = new L.Control.Draw(drawOptions);
    map.addControl(drawControl);
    drawControlRef.current = drawControl;

    // ── On draw start: remove previous rectangle ─────────────────────
    const onDrawStart = () => {
      if (drawnLayerRef.current) {
        map.removeLayer(drawnLayerRef.current);
        drawnLayerRef.current = null;
      }
    };

    // ── On draw created: capture bounds and store in Zustand ─────────
    const onDrawCreated = (e: L.LeafletEvent) => {
      const layer = (e as L.DrawEvents.Created).layer;
      const bounds = (layer as L.Rectangle).getBounds();

      const sw = bounds.getSouthWest();
      const ne = bounds.getNorthEast();

      // Add the rectangle to the map
      map.addLayer(layer);
      drawnLayerRef.current = layer as L.Rectangle;

      // Store in Zustand [G8]
      setBoundingBox({
        sw: { lat: sw.lat, lng: sw.lng },
        ne: { lat: ne.lat, lng: ne.lng },
      });
    };

    map.on(L.Draw.Event.DRAWSTART, onDrawStart);
    map.on(L.Draw.Event.CREATED, onDrawCreated);

    // ── Cleanup ──────────────────────────────────────────────────────
    return () => {
      map.off(L.Draw.Event.DRAWSTART, onDrawStart);
      map.off(L.Draw.Event.CREATED, onDrawCreated);

      if (drawnLayerRef.current) {
        map.removeLayer(drawnLayerRef.current);
        drawnLayerRef.current = null;
      }

      if (drawControlRef.current) {
        map.removeControl(drawControlRef.current);
        drawControlRef.current = null;
      }
    };
  }, [map, setBoundingBox]);

  return null; // This component only adds Leaflet controls imperatively
}
