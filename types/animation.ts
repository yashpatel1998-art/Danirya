export type RevealValues = {
  opacity: number;
  translateY: number;
  blur: number;
};

export type EasingFn = (t: number) => number;

export type InertiaState = {
  current: number;
  target: number;
};

export type StageEnvelope = {
  enterStart: number;
  enterEnd: number;
  exitStart: number;
  exitEnd: number;
};
