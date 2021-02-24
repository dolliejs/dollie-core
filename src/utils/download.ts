/**
 * @file provide download functions
 * @author Lenconda <i@lenconda.top>
 */

import path from 'path';
import decompress from 'decompress';
import _ from 'lodash';
import fs from 'fs-extra';
import got, { Options as GotOptions, RequestError } from 'got';
import { parseRepoDescription } from './scaffold';
import {
  ScaffoldRepoDescription,
  DollieMemoryFileSystem,
  FileSystem,
} from '../interfaces';
import { DollieError, ScaffoldNotFoundError, ScaffoldTimeoutError } from '../errors';
import * as appConstants from '../constants';
import DollieBaseGenerator from '../base';

const { SCAFFOLD_TIMEOUT } = appConstants;

/**
 * download and extract compressed file into a memfs volume
 * @function
 * @param {string} url - url for request and download
 * @param {FileSystem | DollieMemoryFileSystem} fileSystem - a `memfs.Volume` instance
 * @param {string} destination - destination pathname for compressed file's output
 * @param {GotOptions} options - options for `got`
 * @returns {Promise<number>}
 */
const downloadCompressedFile = async (
  url: string,
  fileSystem: FileSystem | DollieMemoryFileSystem,
  destination: string,
  options: GotOptions = {},
): Promise<number> => {
  const startTimestamp = Date.now();
  return new Promise((resolve, reject) => {
    fileSystem.mkdirpSync(destination);

    const getAbsolutePath = (filePath: string) => {
      const relativePathname = filePath.split('/').slice(1).join('/');
      return path.resolve(destination, relativePathname);
    };

    const downloaderOptions = _.merge({ timeout: SCAFFOLD_TIMEOUT }, options || {}, { isStream: true });

    const downloader = got.stream(
      url,
      downloaderOptions as GotOptions & { isStream: true },
    );

    const fileBufferChunks = [];

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

    downloader.on('data', (chunk) => {
      fileBufferChunks.push(chunk);
    });

    downloader.on('end', () => {
      const fileBuffer = Buffer.concat(fileBufferChunks);

      decompress(fileBuffer).then((files) => {
        for (const file of files) {
          const { type, path: filePath, data } = file;
          if (type === 'directory') {
            fileSystem.mkdirpSync(getAbsolutePath(filePath));
          } else if (type === 'file') {
            fileSystem.writeFileSync(getAbsolutePath(filePath), data, { encoding: 'utf8' });
          }
        }
        return;
      }).then(() => {
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
 * @param {FileSystem | DollieMemoryFileSystem} fileSystem - memfs volume instance
 * @param {number} retries - retry times count
 * @param {GotOptions} options - got options
 * @param {DollieBaseGenerator} context - app context
 */
const downloadScaffold = async (
  repoDescription: ScaffoldRepoDescription,
  destination: string,
  fileSystem: FileSystem | DollieMemoryFileSystem = fs,
  retries = 0,
  options: GotOptions = {},
  context: DollieBaseGenerator,
): Promise<number> => {
  const { url, options: repoConfigOptions = {} } = await parseRepoDescription(repoDescription, context);
  try {
    return await downloadCompressedFile(url, fileSystem, destination, options);
  } catch (error) {
    if (error.code === 'E_SCAFFOLD_TIMEOUT' || error instanceof ScaffoldTimeoutError) {
      if (retries < context.constants.SCAFFOLD_RETRIES) {
        return await downloadScaffold(
          repoDescription,
          destination,
          fileSystem,
          retries + 1,
          options,
          context,
        );
      } else {
        throw new Error(error?.message || 'download scaffold timed out');
      }
    } else if (error.code === 'E_SCAFFOLD_NOTFOUND' || error instanceof ScaffoldNotFoundError) {
      if (repoDescription.checkout === 'master') {
        return await downloadScaffold(
          { ...repoDescription, checkout: 'main' },
          destination,
          fileSystem,
          0,
          options,
          context,
        );
      } else {
        throw error;
      }
    } else {
      throw error;
    }
  }
};

export { downloadScaffold, downloadCompressedFile };
