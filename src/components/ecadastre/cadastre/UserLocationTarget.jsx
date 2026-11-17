import { useEffect, useRef } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';

// Cible rouge : cercle + croix + point central, liseré blanc pour rester lisible sur tout fond
export const TARGET_SVG = `<svg width="36" height="36" viewBox="0 0 32 32" style="display:block;filter:drop-shadow(0 1px 3px rgba(0,0,0,0.45))">
  <circle cx="16" cy="16" r="11" fill="rgba(220,38,38,0.15)" stroke="#fff" stroke-width="5"/>
  <circle cx="16" cy="16" r="11" fill="none" stroke="#dc2626" stroke-width="3"/>
  <path d="M16 1v8M16 23v8M1 16h8M23 16h8" stroke="#fff" stroke-width="4.5" stroke-linecap="round"/>
  <path d="M16 1v8M16 23v8M1 16h8M23 16h8" stroke="#dc2626" stroke-width="2.5" stroke-linecap="round"/>
  <circle cx="16" cy="16" r="3.5" fill="#dc2626" stroke="#fff" stroke-width="1.5"/>
</svg>`;

export function createTargetIcon() {
  return L.divIcon({
    className: '',
    html: TARGET_SVG,
    iconSize: [36, 36],
    iconAnchor: [18, 18],
    popupAnchor: [0, -18],
  });
}

/**
 * Affiche la position GPS réelle de l'agent sous forme de cible rouge
 * (la précision est indiquée dans le panneau, pas dessinée sur la carte). Actif uniquement quand `active` est vrai
 * (le GPS est coupé sinon, ce qui économise la batterie).
 *
 * - centerSignal : incrémenter ce nombre pour recentrer la carte sur la position
 *   (dès que la position est connue).
 * - onStatus('searching' | 'ok' | 'error', message?)
 */
export default function UserLocationTarget({ active = true, centerSignal = 0, onStatus, onPosition }) {
  const map = useMap();
  const markerRef = useRef(null);
  const lastPosRef = useRef(null);
  const pendingCenterRef = useRef(false);
  const statusRef = useRef(onStatus);
  const positionRef = useRef(onPosition);
  statusRef.current = onStatus;
  positionRef.current = onPosition;

  // Recentrage demandé
  useEffect(() => {
    if (!centerSignal) return;
    if (lastPosRef.current) {
      map.setView(lastPosRef.current, Math.max(map.getZoom(), 18));
    } else {
      pendingCenterRef.current = true;
    }
  }, [centerSignal, map]);

  useEffect(() => {
    const cleanupLayers = () => {
      if (markerRef.current) { markerRef.current.remove(); markerRef.current = null; }
    };

    if (!active) {
      cleanupLayers();
      lastPosRef.current = null;
      return undefined;
    }
    if (!navigator.geolocation) {
      statusRef.current?.('error', "La localisation n'est pas disponible sur cet appareil.");
      return undefined;
    }

    statusRef.current?.('searching');
    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const ll = [pos.coords.latitude, pos.coords.longitude];
        const acc = pos.coords.accuracy || 0;
        lastPosRef.current = ll;

        if (!markerRef.current) {
          markerRef.current = L.marker(ll, { icon: createTargetIcon(), zIndexOffset: 1000 })
            .addTo(map)
            .bindPopup('Vous êtes ici');
        } else {
          markerRef.current.setLatLng(ll);
        }
        markerRef.current.setPopupContent(`Vous êtes ici<br/><small>Précision : ± ${Math.round(acc)} m</small>`);

        if (pendingCenterRef.current) {
          pendingCenterRef.current = false;
          map.setView(ll, Math.max(map.getZoom(), 18));
        }
        statusRef.current?.('ok', Math.round(acc));
        positionRef.current?.(pos.coords.latitude, pos.coords.longitude);
      },
      (err) => {
        const msg = err.code === 1
          ? 'Localisation refusée. Autorisez-la dans les réglages du navigateur.'
          : 'Position introuvable. Vérifiez que le GPS est activé.';
        statusRef.current?.('error', msg);
      },
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 20000 }
    );

    return () => {
      navigator.geolocation.clearWatch(watchId);
      cleanupLayers();
    };
  }, [active, map]);

  return null;
}
