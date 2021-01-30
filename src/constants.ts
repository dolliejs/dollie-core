import os from 'os';

/**
 * name for this application, used by:
 * - `CACHE_DIR`
 */
export const APP_NAME = 'dollie';
/**
 * home directory of current operating system, used by:
 * - `src/generators/base.ts`
 */
export const HOME_DIR = os.homedir();
/**
 * the directory to save scaffold contents
 * it is a relative path with `HOME_DIR`, used by:
 * - `src/generator/base.ts`
 */
export const CACHE_DIR = `.${APP_NAME}/cache`;
/**
 * the directory to save scaffold contents
 * it is a relative path with `HOME_DIR`, used by:
 * - `src/generator/base.ts`
 */
export const TEMP_DIR = `.${APP_NAME}/temp`;
/**
 * the ignore pattern when traversing files to copy, used by:
 * - `src/utils/generators`
 */
export const TRAVERSE_IGNORE_REGEXP = /^((?!(\.dollie\.json)).)+$/;
/**
 * scaffold prefix for `createParser`, used by:
 * - `src/utils/scaffold.ts`
 */
export const APP_SCAFFOLD_PREFIX = 'scaffold-';
/**
 * extend scaffold prefix for `createParser`, used by:
 * - `src/utils/scaffold.ts`
 */
export const APP_EXTEND_SCAFFOLD_PREFIX = 'extend-scaffold-';
/**
 * default namespace for `createParser`, used by:
 * - `src/utils/scaffold.ts`
 */
export const APP_SCAFFOLD_NAMESPACE = `${APP_NAME}js`;
/**
 * configuration map under `compose` mode, used by:
 * - `src/utils/compose.ts`
 * - `src/generators/compose.ts`
 */
export const APP_COMPOSE_CONFIG_MAP = {
  dollie_scaffold_config: 'dollieScaffoldConfig',
  scaffold_name: 'scaffoldName',
};
