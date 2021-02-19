/**
 * @file provide download functions
 * @author Lenconda <i@lenconda.top>
 */

import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import decompress from 'decompress';
import _ from 'lodash';
import got, { Options as GotOptions, RequestError } from 'got';
import { parseRepoDescription } from './scaffold';
import {
  ScaffoldRepoDescription,
  DollieMemoryFileSystem,
} from '../interfaces';
import { DollieError, ScaffoldNotFoundError, ScaffoldTimeoutError } from '../errors';

/**
 * download and extract zip file into a memfs volume
 * @function
 * @param {string} url - url for request and download
 * @param {DollieMemoryFileSystem} volume - a `memfs.Volume` instance
 * @param {string} destination - destination pathname for zip file's output
 * @returns {Promise<number>}
 */
const downloadZipFile = async (
  url: string,
  volume: DollieMemoryFileSystem,
  destination: string,
  options?: GotOptions,
): Promise<number> => {
  const startTimestamp = Date.now();
  return new Promise((resolve, reject) => {
    volume.mkdirpSync(destination);
    const filename = `/${uuidv4()}.zip`;

    const getAbsolutePath = (filePath: string) => {
      const relativePathname = filePath.split('/').slice(1).join('/');
      return path.resolve(destination, relativePathname);
    };

    const downloaderOptions = _.merge({ timeout: 10000 }, options || {}, { isStream: true });

    const downloader = got.stream(
      url,
      downloaderOptions as GotOptions & { isStream: true },
    );

    downloader.on('error', (error: RequestError) => {
      const errorMessage = error.toString() as string;
      if (errorMessage.indexOf('404') !== -1) {
        reject(new ScaffoldNotFoundError());
      }
      if (error.code === 'ETIMEDOUT') {
        reject(new ScaffoldTimeoutError(downloaderOptions.timeout));
      }
      const otherError = new DollieError(errorMessage);
      otherError.code = error.code || 'E_UNKNOWN';
      reject(new DollieError(errorMessage));
    });

    /**
     * pipe download stream to memfs volume
     */
    downloader.pipe(volume.createWriteStream(filename)).on('finish', () => {
      const fileBuffer = volume.readFileSync(filename);
      decompress(fileBuffer).then((files) => {
        for (const file of files) {
          const { type, path: filePath, data } = file;
          if (type === 'directory') {
            volume.mkdirpSync(getAbsolutePath(filePath));
          } else if (type === 'file') {
            volume.writeFileSync(getAbsolutePath(filePath), data, { encoding: 'utf8' });
          }
        }
        return;
      }).then(() => {
        volume.unlinkSync(filename);
        resolve(Date.now() - startTimestamp);
      });
    });
  });
};

/**
 * download scaffold with retries of 3 times
 * @function
 * @param {ScaffoldRepoDescription} repoDescription - scaffold repository description
 * @param {string} destination - destination pathname in memfs volume
 * @param {DollieMemoryFileSystem} volume - memfs volume instance
 * @param {number} retries - retry times count
 */
const downloadScaffold = async (
  repoDescription: ScaffoldRepoDescription,
  destination: string,
  volume,
  retries = 0,
): Promise<number> => {
  const { zip } = parseRepoDescription(repoDescription);
  try {
    return await downloadZipFile(zip, volume, destination);
  } catch (error) {
    if (error.code === 'E_SCAFFOLD_TIMEOUT' || error instanceof ScaffoldTimeoutError) {
      if (retries < 3) {
        return await downloadScaffold(repoDescription, destination, volume, retries + 1);
      } else {
        throw new Error(error?.message || 'download scaffold timed out');
      }
    } else if (error.code === 'E_SCAFFOLD_NOTFOUND' || error instanceof ScaffoldNotFoundError) {
      if (repoDescription.checkout === 'master') {
        return await downloadScaffold(
          { ...repoDescription, checkout: 'main' },
          destination,
          volume,
          0,
        );
      } else {
        throw error;
      }
    } else {
      throw error;
    }
  }
};

export default downloadScaffold;
