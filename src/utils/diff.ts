import { diffLines, Change } from 'diff';
import _ from 'lodash';

const diff = (originalContent: string, newContent: string): Change[] => {
  const changes = diffLines(originalContent, newContent);
  const result = changes.reduce((result, currentItem) => {
    const lines = (currentItem.value.endsWith('\n')
      ? currentItem.value.slice(0, -1)
      : currentItem.value
    )
      .split('\n')
      .map((item) =>
        _.omit(
          {
            ...currentItem,
            value: `${item}\n`,
          },
          'count'
        )
      );
    return result.concat(lines);
  }, []);

  return result;
};

const merge = (currentChanges: Change[], newChanges: Change[]): Change[] => {
  const result = [];
  const removedQueue = currentChanges.filter((change) => change.removed);
  const addedQueue = currentChanges.filter((change) => change.added);
  for (const newChange of newChanges) {
    if (newChange.removed) {
      if (addedQueue.length > 0 && newChange.value === addedQueue[0].value) {
        result.push(newChange);
        addedQueue.shift();
      }
    } else if (newChange.added) {
      if (
        removedQueue.length > 0 &&
        newChange.value !== removedQueue[0].value
      ) {
        result.push(newChange);
        removedQueue.shift();
      }
    } else {
      result.push(newChange);
    }
  }
  return result;
};

export default diff;
export { merge };
