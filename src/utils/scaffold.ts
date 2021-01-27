export type ScaffoldNameParser = (name: string) => string;

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
  defaultNamespace = 'dolliejs'
): ScaffoldNameParser => {
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

const parseScaffoldName = createParser('scaffold-');
const parseExtendScaffoldName = createParser('extend-scaffold-');

export { parseScaffoldName, parseExtendScaffoldName };
