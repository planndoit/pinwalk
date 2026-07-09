/* eslint-disable @typescript-eslint/no-explicit-any */
export {};

declare global {
  var naver: {
    maps: {
      Map: new (element: HTMLElement, options: any) => any;
      LatLng: new (lat: number, lng: number) => any;
      LatLngBounds: new (sw: any, ne: any) => any;
      Marker: new (options: any) => any;
      Circle: new (options: any) => any;
      Point: new (x: number, y: number) => any;
      Event: {
        addListener: (
          target: any,
          event: string,
          handler: (...args: any[]) => void
        ) => any;
        removeListener: (listener: any) => void;
        trigger: (target: any, event: string, ...args: any[]) => void;
      };
    };
  };
}
