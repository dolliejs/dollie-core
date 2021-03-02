declare module 'loading-indicator' {
  import logUpdate from 'log-update';

  declare type PresetFrame = Array<string>;

  declare type Preset = Record<'spinner' | 'circle' | 'dots' | 'bullets' | 'arrows' | 'clock', PresetFrame>;

  declare type NodeJSIntervalTimer = ReturnType<typeof setInterval>;

  declare interface Options {
    delay?: number;
    frames?: PresetFrame;
    render?: typeof logUpdate | Function;
  }

  export function start(text?: string, options?: Options): NodeJSIntervalTimer;
  export function stop(timer: NodeJSIntervalTimer, shouldKeepOutput?: boolean): void;
}
