export type ScaffoldNameParser = (name: string) => string;

/**
 * parser generator
 * @param scaffoldPrefix string
 * @param defaultNamespace string
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
