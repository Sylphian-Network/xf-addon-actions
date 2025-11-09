const core = require('@actions/core');
const fs = require('fs');
const path = require('path');
const exec = require('@actions/exec');

async function run() {
  try {
    const mainAddon = core.getInput('main_addon', { required: true });
    const baseDir = core.getInput('base_dir', { required: true });
    const phpPath = core.getInput('php_path') || 'php';

    const addonsDir = path.join(baseDir, 'src', 'addons');

    const mainAddonIdentifier = mainAddon.split(/:(.+)/)[0]; // Vendor/AddonName
    const [vendor, addonName] = mainAddonIdentifier.split('/');
    if (!vendor || !addonName) {
      core.setFailed(`Invalid main_addon identifier: ${mainAddon}. Expected format Vendor/AddonName or Vendor/AddonName:https_url`);
      return;
    }

    const addonDir = path.join(addonsDir, vendor, addonName);
    if (!fs.existsSync(addonDir)) {
      core.setFailed(`Addon directory does not exist: ${addonDir}. Ensure the addon is prepared/installed before running lint.`);
      return;
    }

    const phpFiles = [];
    const skipDirs = new Set(['.git', '_releases', '_output', '.idea']);

    function walk(dir) {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          if (skipDirs.has(entry.name)) continue;
          walk(fullPath);
        } else if (entry.isFile() && entry.name.toLowerCase().endsWith('.php')) {
          phpFiles.push(fullPath);
        }
      }
    }

    walk(addonDir);

    if (phpFiles.length === 0) {
      console.log(`No PHP files found under ${addonDir}. Nothing to lint.`);
      return;
    }

    console.log(`Linting ${phpFiles.length} PHP files in ${addonDir}...`);

    const failed = [];

    for (const file of phpFiles) {
      let output = '';
      let errOutput = '';
      const exitCode = await exec.exec(phpPath, ['-l', file], {
        ignoreReturnCode: true,
        listeners: {
          stdout: (data) => (output += data.toString()),
          stderr: (data) => (errOutput += data.toString()),
        },
      });

      if (exitCode !== 0) {
        failed.push({ file, output: output.trim(), error: errOutput.trim() });
        console.error(`Syntax error in ${file}`);
        if (output.trim()) console.error(output.trim());
        if (errOutput.trim()) console.error(errOutput.trim());
      }
    }

    if (failed.length > 0) {
      core.setFailed(`PHP lint failed for ${failed.length} file(s).`);
    } else {
      console.log('PHP lint passed with no syntax errors.');
    }
  } catch (error) {
    core.setFailed(error.message);
  }
}

run();
