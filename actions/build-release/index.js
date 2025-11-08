const core = require('@actions/core');
const fs = require('fs');
const path = require('path');
const { buildAddon, getAddonVersion } = require('../../lib/common');

async function run() {
  try {
    const mainAddon = core.getInput('main_addon', { required: true });
    const baseDir = core.getInput('base_dir', { required: true });

    const addonsDir = path.join(baseDir, 'src', 'addons');
    fs.mkdirSync(addonsDir, { recursive: true });

    await buildAddon(mainAddon, baseDir);

    const version = await getAddonVersion(addonsDir, mainAddon);
    core.setOutput('version', version);

    const mainAddonIdentifier = mainAddon.split(/:(.+)/)[0];
    const releasePath = path.join(addonsDir, mainAddonIdentifier, '_releases', '*.zip');
    core.setOutput('release_path', releasePath);

    console.log(`Built version: ${version}`);
    console.log(`Release artifact path: ${releasePath}`);
  } catch (error) {
    core.setFailed(error.message);
  }
}

run();
