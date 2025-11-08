const core = require('@actions/core');
const fs = require('fs');
const path = require('path');
const { cleanup } = require('../../lib/common');

async function run() {
  try {
    const mainAddon = core.getInput('main_addon', { required: true });
    const dependencies = core.getInput('dependencies') || '';
    const baseDir = core.getInput('base_dir', { required: true });

    const addonsDir = path.join(baseDir, 'src', 'addons');
    fs.mkdirSync(addonsDir, { recursive: true });

    await cleanup(addonsDir, dependencies, mainAddon, baseDir);

    console.log('Cleanup completed.');
  } catch (error) {
    core.setFailed(error.message);
  }
}

run();
