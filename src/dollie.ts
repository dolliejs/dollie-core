import Environment, { Callback } from 'yeoman-environment';
import DollieContainerGenerator from './generators/container';
import DollieInteractiveGenerator from './generators/interactive';
import {
  DollieContainerAppConfig,
  DollieContainerManifest,
  DollieAppMode,
  DollieContainerFinishCallback,
  DollieInteractiveAppConfig,
  DollieComposeAppConfig,
} from './interfaces';
import { DollieError } from './errors';
import DollieComposeGenerator from './generators/compose';

const container = async (config: DollieContainerAppConfig, cb?: Callback): Promise<DollieContainerManifest> => {
  return new Promise((resolve, reject) => {
    const env = Environment.createEnv();
    env.registerStub(DollieContainerGenerator, 'dollie:container');
    env.run('dollie:container', {
      ...config,
      callbacks: {
        onFinish: (data) => resolve(data),
      } as DollieContainerFinishCallback,
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

const run = async (
  mode: DollieAppMode,
  config: DollieInteractiveAppConfig & DollieComposeAppConfig,
  cb?: Callback,
): Promise<void> => {
  switch (mode) {
    case 'interactive': {
      const env = Environment.createEnv();
      env.registerStub(DollieInteractiveGenerator, 'dollie:interactive');
      await env.run('dollie:interactive', config, cb);
      break;
    }
    case 'compose': {
      const env = Environment.createEnv();
      env.registerStub(DollieComposeGenerator, 'dollie:compose');
      await env.run('dollie:compose', config, cb);
      break;
    }
    default: break;
  }
  return;
};

const interactive = async (
  config: DollieInteractiveAppConfig = {},
  cb?: Callback,
) => await run('interactive', config, cb);

const compose = async (
  config: DollieComposeAppConfig = {},
  cb?: Callback,
) => await run('compose', config, cb);

export {
  container,
  interactive,
  compose,
};
