/**
 * parse user's input and return a correct template name
 * @param name string
 * @returns string
 */
const parseScaffoldName = (name: string): string => {
  if (/\//.test(name)) {
    const templateNameChunks = name.split('/');
    return templateNameChunks.reduce((result, currentValue, currentIndex) => {
      return `${currentIndex !== 0 ? `${result}/` : result}${
        currentIndex === templateNameChunks.length - 1
          ? currentValue.startsWith('scaffold-')
            ? currentValue
            : `scaffold-${currentValue}`
          : currentValue
      }`.trim();
    }, '');
  } else {
    return name.startsWith('scaffold-')
      ? `dolliejs/${name}`
      : `dolliejs/scaffold-${name}`;
  }
};

export { parseScaffoldName };
