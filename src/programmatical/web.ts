import Environment from 'yeoman-environment';
import DollieWebGenerator from '../generators/web';
import { DollieAppConfig, DollieWebResponseData } from '../interfaces';

const dollie = async (config: DollieAppConfig): Promise<DollieWebResponseData> => {
  return new Promise((resolve, reject) => {
    const env = Environment.createEnv();
    env.registerStub(DollieWebGenerator, 'dollie:web');
    env.run('dollie:web', config, null);
  });
};

export default dollie;
export { dollie };
