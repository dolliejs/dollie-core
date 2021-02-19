import path from 'path';
import ejs from 'ejs';
import { isBinaryFileSync } from 'isbinaryfile';
import {
  DollieScaffoldNameParser,
  MergeBlock,
  Conflict,
  ConflictSolveTable,
  ScaffoldRepoDescription,
  RepoOrigin,
} from '../interfaces';
import {
  APP_SCAFFOLD_DEFAULT_OWNER,
  APP_SCAFFOLD_PREFIX,
  APP_EXTEND_SCAFFOLD_PREFIX,
  TEMPLATE_FILE_PREFIX,
} from '../constants';

/**
 * parse scaffold name and return a function as parser, which can return a string that
 * matches the pattern of Dollie scaffold's standard
 * @param {string} scaffoldPrefix
 * @param {string} defaultOwner
 * @returns {Function}
 *
 * @example
 * ```
 * const parse = createScaffoldNameParser('scaffold-', 'dolliejs');
 * parse('test'); -> dolliejs/scaffold-test
 * parse('lenconda/test') -> lenconda/scaffold-test
 * parse('lenconda/scaffold-test') -> lenconda/scaffold-test
 * ```
 */
const createScaffoldNameParser = (
  scaffoldPrefix: string,
  defaultOwner = APP_SCAFFOLD_DEFAULT_OWNER,
): DollieScaffoldNameParser => {
  return (repo: string) => {
    let origin: RepoOrigin = 'github';
    let owner = '';
    let name = '';
    let checkout = '';

    if (repo.split('/').length === 2) {
      [owner, name] = repo.split('/');
    } else {
      name = repo;
      owner = defaultOwner;
    }

    if (!name.startsWith(scaffoldPrefix)) {
      name = `${scaffoldPrefix}${name}`;
    }

    if (name.split('#').length === 2) {
      [name, checkout] = name.split('#');
    } else {
      checkout = 'master';
    }

    if (checkout.split('@').length === 2) {
      [checkout, origin] = checkout.split('@') as [string, RepoOrigin];
    }

    return { origin, owner, name, checkout };
  };
};

const parseScaffoldName = createScaffoldNameParser(APP_SCAFFOLD_PREFIX);
const parseExtendScaffoldName = createScaffoldNameParser(APP_EXTEND_SCAFFOLD_PREFIX);

/**
 * parse scaffold repository description to strings
 * @param {ScaffoldRepoDescription} description
 * @returns {object}
 */
const parseRepoDescription = (
  description: ScaffoldRepoDescription,
): { repo: string, zip: string, original: string } => {
  const { owner, name, origin, checkout } = description;
  const urlMap = {
    github: () => {
      return {
        zip: `https://github.com/${owner}/${name}/archive/${checkout}.zip`,
        repo: `https://github.com/${owner}/${name}/tree/${checkout}`,
      };
    },
    gitlab: () => {
      return {
        zip: `https://gitlab.com/${owner}/${name}/repository/archive.zip?ref=${checkout}`,
        repo: `https://gitlab.com/${owner}/${name}/-/tree/${checkout}`,
      };
    },
    bitbucket: () => {
      return {
        zip: `https://bitbucket.org/${owner}/${name}/get/${checkout}.zip`,
        repo: `https://bitbucket.org/${owner}/${name}/src/${checkout}`,
      };
    },
  };
  if (!urlMap[origin]) {
    return {
      zip: '',
      original: '',
      repo: '',
    };
  }
  return { ...urlMap[origin](), original: `${owner}/${name}#${checkout}@${origin}` };
};

/**
 * parse template file pathname and return pathname without `__template.`
 * @param {string} pathname
 */
const parseFilePathname = (pathname: string): string => {
  if (!pathname || pathname === '') {
    return '';
  }
  const pathnameGroup = pathname.split(path.sep);
  const filename = pathnameGroup.pop();
  if (filename.startsWith(TEMPLATE_FILE_PREFIX)) {
    pathnameGroup.push(filename.slice(11));
  } else {
    pathnameGroup.push(filename);
  }
  return pathnameGroup.join(path.sep);
};

/**
 * check if a pathname in config array or not
 * @param {string} pathname
 * @param {string} configItems
 */
const isPathnameInConfig = (
  pathname: string,
  configItems: Array<string>,
): boolean => {
  for (const item of configItems) {
    if (item && new RegExp(item).test(pathname)) {
      return true;
    }
  }
  return false;
};

/**
 * check and count the quantity of conflicted blocks in a file
 * @param {Array<MergeBlock>} blocks
 * @returns {number}
 */
const checkConflictBlockCount = (blocks: Array<MergeBlock>): number => {
  const validBlocks = blocks.filter((block) => block.status === 'CONFLICT');
  return validBlocks.length;
};

/**
 * solve conflicts for a group of files, and return the solved files and
 * also the files that still has conflicts
 * @param {Array<Conflict>} conflicts Array<Conflict>
 * @param {ConflictSolveTable} keeps
 * @returns {object}
 *
 * since Dollie uses an technique (or algorithm) inspired by three-way merge
 * (http://www.cis.upenn.edu/~bcpierce/papers/diff3-short.pdf), there would be
 * three character in every diff:
 * - BASE: the content of last file write by `DIRECT` action
 * - THEIRS: the content of current file in the destination dir, we call it as ``
 */
const solveConflicts = (
  conflicts: Array<Conflict>,
  keeps: ConflictSolveTable,
): { result: Array<Conflict>, ignored: Array<Conflict> } => {
  const result = [];
  const ignored = [];
  const remainedConflicts = Array.from(conflicts);

  while (
    remainedConflicts.filter(
      (conflict) => checkConflictBlockCount(conflict.blocks) > 0,
    ).length !== 0
  ) {
    const currentConflictFile = remainedConflicts.shift();
    const currentBlocks = [];
    const currentKeepsList = keeps[currentConflictFile.pathname];

    if (currentKeepsList.length === 0) {
      currentConflictFile.blocks = currentConflictFile.blocks.map((block) => {
        if (block.status === 'CONFLICT') {
          return { ...block, ignored: true };
        }
        return block;
      });
      ignored.push(currentConflictFile);
      continue;
    }

    let currentCursor = 0;

    for (const block of currentConflictFile.blocks) {
      if (block.status === 'OK') {
        currentBlocks.push(block);
        continue;
      }

      const keeps = currentKeepsList[currentCursor];

      if (typeof keeps === 'string') {
        if (keeps === 'skip') {
          block.status = 'CONFLICT';
          block.ignored = true;
        } else if (['current', 'former', 'all', 'none'].indexOf(keeps) !== -1) {
          switch (keeps) {
            case 'current': {
              block.values.former = [];
              break;
            }
            case 'former': {
              block.values.current = [];
              break;
            }
            case 'all': {
              break;
            }
            case 'none': {
              block.values.former = [];
              block.values.current = [];
              break;
            }
            default:
              break;
          }
          block.status = 'OK';
          block.values.current = block.values.former.concat(block.values.current);
        } else {
          block.status = 'OK';
          const currentContent = keeps.endsWith('\n') ? keeps.slice(0, -1) : keeps;
          block.values.current = currentContent.split('\n').map((value) => `${value}\n`);
          block.values.former = [];
        }
        currentBlocks.push(block);
      } else if (Array.isArray(keeps)) {
        const solvedBlock: MergeBlock = {
          status: 'OK',
          values: {
            former: [],
            current: keeps.reduce((result, currentKey) => {
              const [key, index] = currentKey.split('#');
              result.push(block.values[key][index] || '');
              return result;
            }, [] as Array<string>),
          },
        };
        currentBlocks.push(solvedBlock);
      }
      currentCursor += 1;
    }

    currentConflictFile.blocks = currentBlocks;

    if (checkConflictBlockCount(currentBlocks) > 0) {
      ignored.push(currentConflictFile);
    } else {
      result.push(currentConflictFile);
    }
  }

  return { result, ignored };
};

/**
 * render template file with ejs
 * @param {any} contents
 * @param {object} data
 * @returns {string | Buffer}
 */
const renderTemplate = (contents: any, data: object) => {
  const contentsBuffer = Buffer.from(contents, 'binary');

  if (isBinaryFileSync(contentsBuffer, contentsBuffer.length)) {
    return contentsBuffer;
  } else {
    return ejs.render(contentsBuffer.toString(), data);
  }
};

export {
  parseScaffoldName,
  parseExtendScaffoldName,
  isPathnameInConfig,
  checkConflictBlockCount,
  solveConflicts,
  parseFilePathname,
  parseRepoDescription,
  renderTemplate,
};
