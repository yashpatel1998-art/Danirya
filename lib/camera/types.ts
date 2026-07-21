export type TempleRoom =
  | 'forecourt'
  | 'threshold'
  | 'hall'
  | 'chapel'
  | 'sanctuary';

export type CameraPathFrame = {
  frame: number;
  position: [number, number, number];
  forward: [number, number, number];
  room: TempleRoom;
  velocity: number;
};
