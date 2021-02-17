import Environment from 'yeoman-environment';
import DollieWebGenerator from './generators/web';
import DollieContainerGenerator from './generators/container';
import {
  DollieAppConfig,
  DollieWebResponseData,
  DollieContainerResponseData,
} from './interfaces';

const runWeb = async (config: DollieAppConfig): Promise<DollieWebResponseData> => {
  return new Promise((resolve, reject) => {
    const env = Environment.createEnv();
    env.registerStub(DollieWebGenerator, 'dollie:web');
    env.run('dollie:web', {
      ...config,
      callbacks: {
        onFinish: (data) => resolve(data),
        onError: (error) => reject(error),
      },
    }, null);
  });
};

const runContainer = async (config: DollieAppConfig): Promise<DollieContainerResponseData> => {
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

export default { runWeb, runContainer };
export { runWeb, runContainer };
