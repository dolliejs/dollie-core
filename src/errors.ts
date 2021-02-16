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
