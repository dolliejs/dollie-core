import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import decompress from 'decompress';
import _ from 'lodash';
import got, { Options as GotOptions } from 'got';
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

    const downloader = got.stream(
      url,
      {
        timeout: 10000,
        ...((options || {}) as GotOptions),
        isStream: true,
      },
    );

    downloader.on('error', (error) => {
      const errorMessage = error.toString() as string;
      const newError = new Error() as any;
      if (errorMessage.indexOf('404') !== -1) {
        newError.code = 'ENOTFOUND';
      }
      newError.message = errorMessage;
      reject(newError);
    });

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
        throw new Error(error?.message || 'download scaffold timed out');
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
        throw new Error(error?.message || 'current scaffold repository not found');
      }
    } else {
      throw error;
    }
  }
};

export default downloadScaffold;
