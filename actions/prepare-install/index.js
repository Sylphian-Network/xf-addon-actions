const core = require('@actions/core');
const fs = require('fs');
const path = require('path');
const { preCleanup, prepareAddons, installAddons } = require('../../lib/common');

async function run() {
  try {
    const mainAddon = core.getInput('main_addon', { required: true });
    const dependencies = core.getInput('dependencies') || '';
    const baseDir = core.getInput('base_dir', { required: true });
    const ghToken = core.getInput('gh_token', { required: true });

    const addonsDir = path.join(baseDir, 'src', 'addons');
    fs.mkdirSync(addonsDir, { recursive: true });

    const allAddons = [];
    if (dependencies) allAddons.push(...dependencies.split(','));
    allAddons.push(mainAddon);

    console.log('Pre-cleanup...');
    await preCleanup(addonsDir, dependencies, mainAddon, baseDir);

    console.log('Preparing addons...');
    await prepareAddons(allAddons, addonsDir, ghToken);

    console.log('Installing addons...');
    await installAddons(dependencies, mainAddon, baseDir);

    console.log('Prepare & install complete.');
  } catch (error) {
    core.setFailed(error.message);
  }
}

run();
