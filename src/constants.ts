import os from 'os';

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

export const GITHUB_URL_SCHEMA = 'https://api.github.com/repos/{{owner}}/{{name}}/zipball/{{checkout}}';
export const GITLAB_URL_SCHEMA = 'https://gitlab.com/api/v4/projects/{{id}}/repository/archive.zip?sha={{checkout}}';

export const GITHUB_AUTH_TOKEN = '';
export const GITLAB_AUTH_TOKEN = '';

export const SCAFFOLD_TIMEOUT = 10000;
export const SCAFFOLD_RETRIES = 9;

export const HTTP_PROXY = '';
export const HTTP_PROXY_AUTH = '';

const defaultExportConstants = {
  CACHE_DIR,
  DEPENDS_ON_KEY,
  GITHUB_AUTH_TOKEN,
  GITLAB_AUTH_TOKEN,
  GITLAB_URL_SCHEMA,
  HOME_DIR,
  HTTP_PROXY,
  HTTP_PROXY_AUTH,
  SCAFFOLD_RETRIES,
  SCAFFOLD_TIMEOUT,
  TEMP_DIR,
  TEMPLATE_FILE_PREFIX,
  TRAVERSE_IGNORE_REGEXP,
};

export const CONFIG_OPTIONS = {
  cacheDir: CACHE_DIR,
  dependsOnKey: DEPENDS_ON_KEY,
  githubAuthToken: GITHUB_AUTH_TOKEN,
  gitlabAuthToken: GITLAB_AUTH_TOKEN,
  gitlabUrlSchema: GITLAB_URL_SCHEMA,
  homeDir: HOME_DIR,
  httpProxy: HTTP_PROXY,
  httpProxyAuth: HTTP_PROXY_AUTH,
  scaffoldRetries: SCAFFOLD_RETRIES,
  scaffoldTimeout: SCAFFOLD_TIMEOUT,
  tempDir: TEMP_DIR,
  templateFilePrefix: TEMPLATE_FILE_PREFIX,
  traverseIgnoreRegexp: TRAVERSE_IGNORE_REGEXP,
};

export default { ...defaultExportConstants };
