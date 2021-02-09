import downloadGitRepo from 'download-git-repo';

/**
 * @author lenconda <i@lenconda.top>
 * @param repo string
 * @param destination string
 * @returns Promise<number>
 *
 * download a git repo into local filesystem, and returns
 * the whole duration of downloading process
 */
const download = async (repo: string, destination: string): Promise<number> => {
  return new Promise((resolve, reject) => {
    const startTime = Date.now();

    // download git repository via HTTP, NOT via SSH
    downloadGitRepo(repo, destination, { clone: false, timeout: 15000 }, (err) => {
      const error = err as any;
      if (error) {
        const rejectedError = new Error() as any;
        rejectedError.originalError = error;
        if (error.code === 'ETIMEDOUT') {
          rejectedError.code = 'ETIMEDOUT';
          reject(rejectedError);
        } else if (error.statusCode === 404) {
          rejectedError.code = 'ENOTFOUND';
          reject(rejectedError);
        } else {
          reject(error);
        }
      }
      // when download progress is completed, resolve the duration
      resolve(Date.now() - startTime);
    });
  });
};

/**
 * download scaffold with retries of 3 times
 * @param repo string
 * @param destination string
 * @param retries number
 */
const downloadScaffold = async (repo: string, destination: string, retries = 0): Promise<number> => {
  let branchName = '';
  let repoId = '';

  [repoId, branchName] = repo.split('#');

  try {
    return await download(`${repoId}#${branchName}`, destination);
  } catch (error) {
    if (error.code === 'ETIMEDOUT') {
      if (retries < 3) {
        return await downloadScaffold(repoId, destination, retries + 1);
      } else {
        throw new Error(error?.originalError?.message || 'download scaffold timed out');
      }
    } else if (error.code === 'ENOTFOUND') {
      if (branchName === 'master') {
        return await downloadScaffold(`${repoId}#main`, destination, 0);
      } else {
        throw new Error('current scaffold repository not found');
      }
    } else {
      throw error;
    }
  }
};

export default downloadScaffold;
