import {
  ConflictKeepsTable,
  DollieScaffoldNameParser,
  MergeBlock,
  MergeConflictRecord,
} from '../interfaces';
import {
  APP_SCAFFOLD_NAMESPACE,
  APP_SCAFFOLD_PREFIX,
  APP_EXTEND_SCAFFOLD_PREFIX,
} from '../constants';

/**
 * parse scaffold name and return a function as parser, which can return a string that
 * matches the pattern of Dollie scaffold's standard
 * @param scaffoldPrefix string
 * @param defaultNamespace string
 *
 * @example
 * ```
 * const parse = createParser('scaffold-', 'dolliejs');
 * parse('test'); -> dolliejs/scaffold-test
 * parse('lenconda/test') -> lenconda/scaffold-test
 * parse('lenconda/scaffold-test') -> lenconda/scaffold-test
 * ```
 */
const createParser = (
  scaffoldPrefix: string,
  defaultNamespace = APP_SCAFFOLD_NAMESPACE
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

const parseScaffoldName = createParser(APP_SCAFFOLD_PREFIX);
const parseExtendScaffoldName = createParser(APP_EXTEND_SCAFFOLD_PREFIX);

/**
 * check if a pathname in config array or not
 * @param pathname string
 * @param configItems string
 */
const isPathnameInConfig = (
  pathname: string,
  configItems: Array<string>
): boolean => {
  for (const item of configItems) {
    if (item && new RegExp(item).test(pathname)) {
      return true;
    }
  }
  return false;
};

const checkConflictBlockCount = (blocks: Array<MergeBlock>): number => {
  const validBlocks = blocks.filter(
    (block) => block.status === 'CONFLICT'
  );
  return validBlocks.length;
};

const solveConflicts = (
  conflicts: Array<MergeConflictRecord>,
  keepsTable: ConflictKeepsTable
): { result: Array<MergeConflictRecord>, ignored: Array<MergeConflictRecord> } => {
  const result = [];
  const ignored = [];
  const remainedConflicts = Array.from(conflicts);
  while (
    remainedConflicts.filter(
      (conflict) => checkConflictBlockCount(conflict.blocks) > 0
    ).length !== 0
  ) {
    const currentConflictFile = remainedConflicts.shift();
    const currentBlocks = [];
    const currentKeepsList = keepsTable[currentConflictFile.pathname] || [];

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
      const keeps = currentKeepsList[currentCursor] || [];
      if (keeps.length === 0) {
        currentBlocks.push({ ...block, ignored: true });
      } else {
        const solvedBlock: MergeBlock = {
          status: 'OK',
          values: {
            former: [],
            current: keeps.reduce((result, currentKey) => {
              const [key, index] = currentKey.split('#');
              result.push(block.values[key][index]);
              return result;
            // eslint-disable-next-line prettier/prettier
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
};
