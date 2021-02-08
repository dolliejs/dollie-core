import path from 'path';
import {
  DollieScaffoldNameParser,
  MergeBlock,
  Conflict,
  ConflictSolveTable,
} from '../interfaces';
import {
  APP_SCAFFOLD_NAMESPACE,
  APP_SCAFFOLD_PREFIX,
  APP_EXTEND_SCAFFOLD_PREFIX,
  TEMPLATE_FILE_PREFIX,
} from '../constants';

/**
 * parse scaffold name and return a function as parser, which can return a string that
 * matches the pattern of Dollie scaffold's standard
 * @param scaffoldPrefix string
 * @param defaultNamespace string
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
  defaultNamespace = APP_SCAFFOLD_NAMESPACE,
): DollieScaffoldNameParser => {
  return (name: string) => {
    if (/\//.test(name)) {
      const templateNameChunks = name.split('/');
      return templateNameChunks.reduce((result, currentValue, currentIndex) => {
        return `${currentIndex !== 0 ? `${result}/` : result}${
          currentIndex === templateNameChunks.length - 1
            ? currentValue.startsWith(scaffoldPrefix)
              ? currentValue
              : `${scaffoldPrefix}${currentValue}`
            : currentValue
        }`.trim();
      }, '');
    } else {
      return name.startsWith(scaffoldPrefix)
        ? `${defaultNamespace}/${name}`
        : `${defaultNamespace}/${scaffoldPrefix}${name}`;
    }
  };
};

const parseScaffoldName = createScaffoldNameParser(APP_SCAFFOLD_PREFIX);
const parseExtendScaffoldName = createScaffoldNameParser(APP_EXTEND_SCAFFOLD_PREFIX);

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
 * @param pathname string
 * @param configItems string
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
 * @param blocks Array<MergeBlock>
 * @returns number
 */
const checkConflictBlockCount = (blocks: Array<MergeBlock>): number => {
  const validBlocks = blocks.filter((block) => block.status === 'CONFLICT');
  return validBlocks.length;
};

/**
 * solve conflicts for a group of files, and return the solved files and
 * also the files that still has conflicts
 * @param conflicts Array<Conflict>
 * @param keeps ConflictKeepsTable
 * @returns object
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
          block.status = keeps === 'skip' ? 'CONFLICT' : 'OK';
          block.ignored = keeps === 'skip' ? true : false;
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

export {
  parseScaffoldName,
  parseExtendScaffoldName,
  isPathnameInConfig,
  checkConflictBlockCount,
  solveConflicts,
  parseFilePathname,
};
