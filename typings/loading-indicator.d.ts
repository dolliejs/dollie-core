declare module 'loading-indicator' {
  import * as frames from 'loading-indicator/presets';
  import logUpdate from 'log-update';

  type NodeJSIntervalTimer = ReturnType<typeof setInterval>;

  interface Options {
    delay?: number;
    frames?: typeof frames;
    render?: typeof logUpdate | Function;
  }

  function start(text?: string, options?: Options): NodeJSIntervalTimer;
  function stop(timer: NodeJSIntervalTimer, shouldKeepOutput?: boolean): void;

  exports.start = start;
  exports.stop = stop;
}
