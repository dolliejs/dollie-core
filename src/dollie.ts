import Environment from 'yeoman-environment';
import DollieMemoryGenerator from './generators/memory';
import DollieContainerGenerator from './generators/container';
import {
  DollieAppConfig,
  DollieWebResponseData,
  DollieContainerResponseData,
} from './interfaces';
import { DollieError } from './errors';

const memory = async (config: DollieAppConfig): Promise<DollieWebResponseData> => {
  return new Promise((resolve, reject) => {
    const env = Environment.createEnv();
    env.registerStub(DollieMemoryGenerator, 'dollie:memory');
    env.run('dollie:memory', {
      ...config,
      callbacks: {
        onFinish: (data) => resolve(data),
      },
    }, (error) => {
      if (error) {
        if (!(error instanceof DollieError)) {
          reject(new DollieError(error.message || 'Unknown error'));
        } else {
          reject(error);
        }
      }
    });
  });
};

const container = async (config: DollieAppConfig): Promise<DollieContainerResponseData> => {
  return new Promise((resolve, reject) => {
    const env = Environment.createEnv();
    env.registerStub(DollieContainerGenerator, 'dollie:container');
    env.run('dollie:container', {
      ...config,
      callbacks: {
        onFinish: (data) => resolve(data),
        onError: (error) => reject(error),
      },
    }, null);
  });
};

export default {
  memory,
  container,
};
export { memory, container };
