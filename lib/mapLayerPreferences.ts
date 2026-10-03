import {
  DEFAULT_MAP_LAYER_VISIBILITY,
  type MapLayerKey,
  type MapLayerVisibility,
} from "@/components/MapLayerToggle";

const LAYER_VISIBILITY_KEY = "map-layer-visibility";
const MY_CREW_ONLY_KEY = "map-my-crew-only";

const listeners = new Set<() => void>();
let layerVisibility: MapLayerVisibility | null = null;
let myCrewOnly: boolean | null = null;

function emit(): void {
  for (const listener of listeners) listener();
}

function readLayerVisibility(): MapLayerVisibility {
  try {
    const raw = window.localStorage.getItem(LAYER_VISIBILITY_KEY);
    if (!raw) return DEFAULT_MAP_LAYER_VISIBILITY;
    const parsed = JSON.parse(raw) as Partial<MapLayerVisibility>;
    return {
      landmarks:
        typeof parsed.landmarks === "boolean"
          ? parsed.landmarks
          : DEFAULT_MAP_LAYER_VISIBILITY.landmarks,
      pins:
        typeof parsed.pins === "boolean"
          ? parsed.pins
          : DEFAULT_MAP_LAYER_VISIBILITY.pins,
      crews:
        typeof parsed.crews === "boolean"
          ? parsed.crews
          : DEFAULT_MAP_LAYER_VISIBILITY.crews,
      premium:
        typeof parsed.premium === "boolean"
          ? parsed.premium
          : DEFAULT_MAP_LAYER_VISIBILITY.premium,
    };
  } catch {
    return DEFAULT_MAP_LAYER_VISIBILITY;
  }
}

export function subscribeMapLayerPreferences(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getLayerVisibilitySnapshot(): MapLayerVisibility {
  if (layerVisibility === null) {
    layerVisibility = readLayerVisibility();
  }
  return layerVisibility;
}

export function getLayerVisibilityServerSnapshot(): MapLayerVisibility {
  return DEFAULT_MAP_LAYER_VISIBILITY;
}

export function saveLayerVisible(key: MapLayerKey, visible: boolean): void {
  const updated = { ...getLayerVisibilitySnapshot(), [key]: visible };
  layerVisibility = updated;
  try {
    window.localStorage.setItem(LAYER_VISIBILITY_KEY, JSON.stringify(updated));
  } catch {
    // ignore quota / private mode
  }
  emit();
}

export function getMyCrewOnlySnapshot(): boolean {
  if (myCrewOnly === null) {
    try {
      myCrewOnly = window.localStorage.getItem(MY_CREW_ONLY_KEY) === "1";
    } catch {
      myCrewOnly = false;
    }
  }
  return myCrewOnly;
}

export function getMyCrewOnlyServerSnapshot(): boolean {
  return false;
}

export function saveMyCrewOnly(next: boolean): void {
  myCrewOnly = next;
  try {
    window.localStorage.setItem(MY_CREW_ONLY_KEY, next ? "1" : "0");
  } catch {
    // ignore
  }
  emit();
}
