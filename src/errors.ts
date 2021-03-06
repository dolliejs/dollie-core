import { DollieAppMode } from './interfaces';

export class DollieError extends Error {
  public code: string;

  public constructor(message: string) {
    super(message);
  }
}

export class ScaffoldNotFoundError extends DollieError {
  public code = 'E_SCAFFOLD_NOTFOUND';

  public constructor() {
    super('Scaffold not found');
  }
}

export class ScaffoldTimeoutError extends DollieError {
  public code = 'E_SCAFFOLD_TIMEOUT';

  public constructor(timeout: number) {
    super(`Download scaffold timed out in ${timeout}ms`);
  }
}

export class ModeInvalidError extends DollieError {
  public code = 'E_MODE_INVALID';

  public constructor(mode: DollieAppMode) {
    super(`Mode \`${mode}\` is invalid`);
  }
}

export class DestinationExistsError extends DollieError {
  public code = 'E_DESTINATION_EXISTS';

  public constructor(pathname: string) {
    super(`Destination ${pathname} exists, cannot write files into it`);
  }
}

export class ArgInvalidError extends DollieError {
  public code = 'E_ARG_INVALID';

  public constructor(argNames: Array<string>) {
    super(
      argNames.length > 0
        ? 'Missing required argument(s): ' +
          `${argNames.map((name) => `\`${name}\``).join(', ')}`
        : 'Some required args lost',
    );
  }
}

export class ComposeScaffoldConfigInvalidError extends DollieError {
  public code = 'E_COMPOSE_SCAFFOLD_CONFIG_INVALID';

  public constructor() {
    super('Cannot read scaffold configuration under `compose` mode');
  }
}
