/**
 * @file src/generators/container.ts
 * @author lenconda <i@lenconda.top>
 */

import _ from 'lodash';
import path from 'path';
import fs from 'fs-extra';
import { v4 as uuidv4 } from 'uuid';
import DollieComposeGenerator from './compose';
import { DollieContainerManifest, TraverseResultItem } from '../interfaces';
import DollieBaseGenerator from '../base';
import { ArgInvalidError } from '../errors';
import traverse from '../utils/traverse';
import { GitIgnoreMatcher } from '../utils/ignore';

const handleFinish = (data: DollieContainerManifest, context: DollieBaseGenerator) => {
  const onFinishFunc = _.get(context, 'options.callbacks.onFinish');
  if (onFinishFunc && typeof onFinishFunc === 'function') {
    onFinishFunc(data);
  }
};

class DollieContainerGenerator extends DollieComposeGenerator {
  public initializing() {
    super.initializing.call(this);
    this.mode = 'container';
    if (!this.projectName) {
      throw new ArgInvalidError(['projectName']);
    }
  }

  public async default() {
    await super.default.call(this);
  }

  public async writing() {
    await DollieBaseGenerator.prototype.writing.call(this);
  }

  public install() {
    super.install.call(this);
  }

  public async end() {
    await super.end.call(this);
    const gitIgnoreFileContent = fs.readFileSync(this.destinationPath('.gitignore')) || '';
    const matcher = new GitIgnoreMatcher(gitIgnoreFileContent.toString());
    const acceptedFiles = await traverse(this.destinationPath(), matcher);
    const ignoredFiles = await traverse(this.destinationPath(), matcher, fs, false);
    const relative = (item: TraverseResultItem): TraverseResultItem => {
      return {
        ...item,
        pathname: path.relative(this.destinationPath(), item.pathname),
      };
    };
    handleFinish({
      files: acceptedFiles.map(relative),
      ignoredFiles: ignoredFiles.map(relative),
      conflicts: this.conflicts,
      basePath: this.destinationPath(),
    }, this);
  }

  protected getDestinationRoot() {
    const outputPath =
      _.get(this, 'options.outputPath') || path.resolve(this.appTempPath);
    const destinationRoot = path.resolve(outputPath, uuidv4());
    if (fs.existsSync(destinationRoot)) {
      return this.getDestinationRoot();
    }
    return destinationRoot;
  }
}

export default DollieContainerGenerator;
