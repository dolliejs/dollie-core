declare interface GitCloneOptions {
  clone?: boolean;
  git?: string;
  shallow?: boolean;
  checkout?: string;
  extract?: boolean;
  filename?: string;
}

declare module 'download-git-repo' {
  import { Options as GotOptions } from 'got';
  import { DownloadOptions } from 'download';

  function clone(
    repository: string,
    destination: string,
    options?: GitCloneOptions & GotOptions & DownloadOptions,
    cb?: (error?: Error) => void,
  ): void;

  export = clone;
}
