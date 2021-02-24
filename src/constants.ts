import os from 'os';

/**
 * configuration map under `compose` mode, used by:
 * - `src/utils/compose.ts`
 * - `src/generators/compose.ts`
 */
export const APP_COMPOSE_CONFIG_MAP = {
  dollie_scaffold_config: 'dollieScaffoldConfig',
  scaffold_name: 'scaffoldName',
  conflict_keeps_table: 'keepsTable',
  project_name: 'projectName',
};
/**
 * extend scaffold prefix for `createParser`, used by:
 * - `src/utils/scaffold.ts`
 */
export const APP_EXTEND_SCAFFOLD_PREFIX = 'extend-scaffold-';
/**
 * name for this application, used by:
 * - `CACHE_DIR`
 */
export const APP_NAME = 'dollie';
/**
 * default namespace for `createParser`, used by:
 * - `src/utils/scaffold.ts`
 */
export const APP_SCAFFOLD_DEFAULT_OWNER = `${APP_NAME}js`;
/**
 * scaffold prefix for `createParser`, used by:
 * - `src/utils/scaffold.ts`
 */
export const APP_SCAFFOLD_PREFIX = 'scaffold-';
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
 * a config name if current name is related to another scaffold
 *
 * @example
 * `$DEPENDS_ON$` -> true
 * `$DEPENDS_ON` -> false
 * `$depends_on$` -> false
 */
export const DEPENDS_ON_KEY = '$DEPENDS_ON$';
/**
 * the directory to save scaffold contents
 * it is a relative path with `HOME_DIR`, used by:
 * - `src/generator/base.ts`
 */
export const TEMP_DIR = `.${APP_NAME}/temp`;
/**
 * template file prefix for Dollie to read
 * if a filename is `__template.foo.txt`, it will be considered by Dollie as
 * a template file
 */
export const TEMPLATE_FILE_PREFIX = '__template.';
/**
 * the ignore pattern when traversing files to copy, used by:
 * - `src/utils/generators`
 */
export const TRAVERSE_IGNORE_REGEXP = new RegExp('.dollie.(js|json)$');

export const GITHUB_URL = 'https://api.github.com/repos/{{owner}}/{{name}}/zipball/{{checkout}}';
export const GITLAB_URL = 'https://gitlab.com/{{owner}}/{{name}}/repository/archive.zip?ref={{checkout}}';
export const BITBUCKET_URL = 'https://bitbucket.org/{{owner}}/{{name}}/get/{{checkout}}.zip';

export const GITHUB_AUTH_HEADER = 'Authorization';
export const GITHUB_AUTH_TOKEN = '';

export const SCAFFOLD_TIMEOUT = 10000;
export const SCAFFOLD_RETRIES = 3;

export default {
  BITBUCKET_URL,
  CACHE_DIR,
  DEPENDS_ON_KEY,
  GITHUB_AUTH_TOKEN,
  GITHUB_URL,
  GITLAB_URL,
  HOME_DIR,
  SCAFFOLD_RETRIES,
  SCAFFOLD_TIMEOUT,
  TEMP_DIR,
  TEMPLATE_FILE_PREFIX,
  TRAVERSE_IGNORE_REGEXP,
};
