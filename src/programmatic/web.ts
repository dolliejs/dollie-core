import Environment from 'yeoman-environment';
import DollieWebGenerator from '../generators/web';
import { DollieAppConfig, DollieWebResponseData } from '../interfaces';

const run = async (config: DollieAppConfig): Promise<DollieWebResponseData> => {
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

export default { run };
export { run };
