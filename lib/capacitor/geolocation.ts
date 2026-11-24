import { Capacitor } from "@capacitor/core";
import { Geolocation, type PermissionStatus } from "@capacitor/geolocation";
import { isCapacitorNative } from "./platform";

export function hasNativeGeolocation(): boolean {
  return isCapacitorNative() && Capacitor.isPluginAvailable("Geolocation");
}

function isLocationGranted(permissions: PermissionStatus): boolean {
  return permissions.location === "granted" || permissions.coarseLocation === "granted";
}

let pendingPermission: Promise<boolean> | undefined;

export function ensureNativeLocationPermission(): Promise<boolean> {
  pendingPermission ??= (async () => {
    const permissions = await Geolocation.checkPermissions();
    if (isLocationGranted(permissions)) return true;
    if (permissions.location !== "prompt") return false;
    return isLocationGranted(await Geolocation.requestPermissions());
  })().finally(() => {
    pendingPermission = undefined;
  });

  return pendingPermission;
}
