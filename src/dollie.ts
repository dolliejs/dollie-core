import Environment, { Callback } from 'yeoman-environment';
import DollieMemoryGenerator from './generators/memory';
import DollieContainerGenerator from './generators/container';
import DollieInteractiveGenerator from './generators/interactive';
import {
  DollieAppConfig,
  DollieWebResponseData,
  DollieContainerResponseData,
  DollieAppMode,
} from './interfaces';
import { DollieError } from './errors';
import DollieComposeGenerator from './generators/compose';

const memory = async (config: DollieAppConfig, cb?: Callback): Promise<DollieWebResponseData> => {
  return new Promise((resolve, reject) => {
    const env = Environment.createEnv();
    env.registerStub(DollieMemoryGenerator, 'dollie:memory');
    env.run('dollie:memory', {
      ...config,
      callbacks: {
        onFinish: (data) => resolve(data),
      },
    }, (error) => {
      if (cb && typeof cb === 'function') {
        cb(error);
      }
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

const container = async (config: DollieAppConfig, cb?: Callback): Promise<DollieContainerResponseData> => {
  return new Promise((resolve, reject) => {
    const env = Environment.createEnv();
    env.registerStub(DollieContainerGenerator, 'dollie:container');
    env.run('dollie:container', {
      ...config,
      callbacks: {
        onFinish: (data) => resolve(data),
      },
    }, (error) => {
      if (cb && typeof cb === 'function') {
        cb(error);
      }
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

const run = async (mode: DollieAppMode, config: Record<string, any>, cb?: Callback) => {
  switch (mode) {
    case 'interactive': {
      const env = Environment.createEnv();
      env.registerStub(DollieInteractiveGenerator, 'dollie:interactive');
      await env.run('dollie:interactive', cb);
      break;
    }
    case 'compose': {
      const env = Environment.createEnv();
      env.registerStub(DollieComposeGenerator, 'dollie:compose');
      await env.run('dollie:compose', config, cb);
      break;
    }
    case 'container': {
      return await container(config as DollieAppConfig, cb);
    }
    case 'memory': {
      return await memory(config as DollieAppConfig, cb);
    }
    default: break;
  }
};

export default { memory, container, run };
export { memory, container, run };
