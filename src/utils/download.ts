import path from 'path';
import unzip from 'unzip-stream';
import _ from 'lodash';
import download, { DownloadOptions } from 'download';
import { parseRepoDescription } from './scaffold';
import {
  ScaffoldRepoDescription,
  DollieMemoryFileSystem,
} from '../interfaces';

/**
 * @author lenconda <i@lenconda.top>
 * @param repo string
 * @param destination string
 * @returns Promise<number>
 *
 * download a git repo into local filesystem, and returns
 * the whole duration of downloading process
 */
const downloadZipFile = async (
  url: string,
  volume: DollieMemoryFileSystem,
  destination: string,
  options?: DownloadOptions,
): Promise<number> => {
  const startTimestamp = Date.now();
  return new Promise((resolve, reject) => {
    volume.mkdirpSync(destination);
    const entries = [];

    const getAbsolutePath = (filePath: string) => {
      const relativePathname = filePath.split('/').slice(1).join('/');
      return path.resolve(destination, relativePathname);
    };

    const downloader = download(url, '', _.merge({ timeout: 10000 }, options || {}));
    const unzipParser = unzip.Parse();

    downloader.catch((error) => {
      if (error.statusCode === 404) {
        error.code = 'ENOTFOUND';
        reject(error);
      }
    });
    downloader.on('error', (error) => {
      if (error.statusCode !== 404) {
        reject(error);
      }
    });
    unzipParser.on('error', (error) => reject(error));

    downloader.pipe(unzipParser);

    unzipParser
      .on('entry', (entry) => entries.push(entry))
      .on('finish', () => {
        Promise.all(entries.map((entry) => new Promise<void>((resolve1) => {
          const { path: filePath, type } = entry;
          if (type === 'Directory') {
            volume.mkdirpSync(getAbsolutePath(filePath));
            resolve1();
          } else if (type === 'File') {
            entry
              .pipe(volume.createWriteStream(getAbsolutePath(filePath)))
              .on('finish', () => resolve1())
              .on('error', () => resolve1());
          } else {
            resolve1();
          }
        }))).then(() => resolve(Date.now() - startTimestamp));
      });
  });
};

/**
 * download scaffold with retries of 3 times
 * @param repo string
 * @param destination string
 * @param retries number
 */
const downloadScaffold = async (
  repoDescription: ScaffoldRepoDescription,
  destination: string,
  retries = 0,
  volume,
): Promise<number> => {
  const { zip } = parseRepoDescription(repoDescription);
  try {
    return await downloadZipFile(zip, volume, destination);
  } catch (error) {
    if (error.code === 'ETIMEDOUT') {
      if (retries < 3) {
        return await downloadScaffold(repoDescription, destination, retries + 1, volume);
      } else {
        throw new Error(error?.originalError?.message || 'download scaffold timed out');
      }
    } else if (error.code === 'ENOTFOUND') {
      if (repoDescription.checkout === 'master') {
        return await downloadScaffold(
          { ...repoDescription, checkout: 'main' },
          destination,
          0,
          volume,
        );
      } else {
        throw new Error('current scaffold repository not found');
      }
    } else {
      throw error;
    }
  }
};

export default downloadScaffold;
