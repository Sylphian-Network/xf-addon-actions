const core = require('@actions/core');
const fs = require('fs');
const path = require('path');
const exec = require('@actions/exec');

async function run() {
  try {
    const mainAddon = core.getInput('main_addon', { required: true });
    const baseDir = core.getInput('base_dir', { required: true });

    const mainAddonIdentifier = mainAddon.split(/:(.+)/)[0]; // Vendor/AddonName
    const [vendor, addonName] = mainAddonIdentifier.split('/');
    if (!vendor || !addonName) {
      core.setFailed(
        `Invalid main_addon identifier: ${mainAddon}. Expected format Vendor/AddonName or Vendor/AddonName:https_url`
      );
      return;
    }

    const addonDir = path.join(baseDir, 'src', 'addons', vendor, addonName);
    if (!fs.existsSync(addonDir)) {
      core.setFailed(
        `Addon directory does not exist: ${addonDir}. Ensure the addon is prepared/installed before running php-cs-fixer.`
      );
      return;
    }

    let phpCsFixerPath = path.join(baseDir, 'vendor', 'bin', 'php-cs-fixer');
    const phpCsFixerBat = path.join(baseDir, 'vendor', 'bin', 'php-cs-fixer.bat');
    if (!fs.existsSync(phpCsFixerPath) && fs.existsSync(phpCsFixerBat)) {
      phpCsFixerPath = phpCsFixerBat;
    }

    if (!fs.existsSync(phpCsFixerPath)) {
      core.setFailed(
        `php-cs-fixer binary not found at ${path.join(
          baseDir,
          'vendor',
          'bin'
        )}. Please ensure php-cs-fixer is installed via Composer before running this action.`
      );
      return;
    }

    const targetPath = path.join('src', 'addons', vendor, addonName);

    console.log(`Running php-cs-fixer: \n  ${phpCsFixerPath} fix ${targetPath}\n  (cwd: ${baseDir})`);

    let stdout = '';
    let stderr = '';
    const exitCode = await exec.exec(phpCsFixerPath, ['fix', targetPath], {
      cwd: baseDir,
      ignoreReturnCode: true,
      listeners: {
        stdout: (data) => (stdout += data.toString()),
        stderr: (data) => (stderr += data.toString()),
      },
    });

    if (stdout.trim()) console.log(stdout.trim());
    if (exitCode !== 0) {
      if (stderr.trim()) console.error(stderr.trim());
      core.setFailed(`php-cs-fixer exited with code ${exitCode}.`);
      return;
    }

    console.log('php-cs-fixer completed successfully.');
  } catch (error) {
    core.setFailed(error.message);
  }
}

run();
