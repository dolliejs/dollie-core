declare interface GitCloneOptions {
  clone?: boolean;
  git?: string;
  shallow?: boolean;
  checkout?: string;
  extract?: boolean;
  filename?: string;
}

declare module 'download-git-repo' {
  import * as Got from 'got';
  import * as Download from 'download';

  function clone(
    repository: string,
    destination: string,
    options?: GitCloneOptions & Got.Options & Download.DownloadOptions,
    cb?: (error?: Error) => void,
  ): void;

  export = clone;
}
