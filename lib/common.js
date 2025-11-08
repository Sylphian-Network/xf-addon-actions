const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

async function preCleanup(addonsDir, dependencies, mainAddon, baseDir) {
  const all = [];
  if (dependencies) all.push(...dependencies.split(','));
  all.push(mainAddon);

  for (const dep of all) {
    const addonIdentifier = dep.split(/:(.+)/)[0];
    const [vendor, name] = addonIdentifier.split('/');

    try {
      console.log(`Uninstalling possible previous install of ${addonIdentifier}...`);
      execSync(`php cmd.php xf-addon:uninstall ${addonIdentifier} || true`, {
        cwd: baseDir,
        stdio: 'inherit',
      });
    } catch (ignore) {}

    const addonPath = path.join(addonsDir, vendor, name);
    if (fs.existsSync(addonPath)) {
      console.log(`Removing old addon directory: ${addonPath}`);
      fs.rmSync(addonPath, { recursive: true, force: true });
    }
  }
}

async function prepareAddons(addons, addonsDir, ghToken) {
  if (!addons || !addons.length) return;

  for (const dep of addons) {
    let [addonIdentifier, repoUrl] = dep.split(/:(.+)/);

    const [vendor, addonName] = addonIdentifier.split('/');
    const vendorDir = path.join(addonsDir, vendor);
    fs.mkdirSync(vendorDir, { recursive: true });

    const addonDir = path.join(vendorDir, addonName);

    if (repoUrl && repoUrl.startsWith('https://') && !repoUrl.includes('@')) {
      repoUrl = repoUrl.replace('https://', `https://x-access-token:${ghToken}@`);
    }

    if (fs.existsSync(path.join(addonDir, '.git'))) {
      console.log(`Updating ${addonIdentifier}...`);
      execSync('git pull', { cwd: addonDir, stdio: 'inherit' });
    } else {
      console.log(`Cloning ${addonIdentifier} from ${repoUrl || addonName}...`);
      execSync(`git clone ${repoUrl || addonName} ${addonName}`, { cwd: vendorDir, stdio: 'inherit' });
    }
  }
}

async function installAddons(dependencies, mainAddon, baseDir) {
  if (dependencies) {
    const deps = dependencies.split(',');
    for (const dep of deps) {
      const addonIdentifier = dep.split(/:(.+)/)[0]; // only Vendor/AddonName
      console.log(`Installing dependency ${addonIdentifier}...`);
      execSync(`php cmd.php xf-addon:install ${addonIdentifier} --force`, { cwd: baseDir, stdio: 'inherit' });
    }
  }

  const mainAddonIdentifier = mainAddon.split(/:(.+)/)[0];
  console.log(`Installing main addon ${mainAddonIdentifier}...`);
  execSync(`php cmd.php xf-addon:install ${mainAddonIdentifier} --force`, { cwd: baseDir, stdio: 'inherit' });
}

async function buildAddon(mainAddon, baseDir) {
  const mainAddonIdentifier = mainAddon.split(/:(.+)/)[0];
  console.log(`Building main addon ${mainAddonIdentifier}...`);
  execSync(`php cmd.php xf-addon:build-release ${mainAddonIdentifier}`, { cwd: baseDir, stdio: 'inherit' });
}

async function getAddonVersion(addonsDir, mainAddon) {
  const mainAddonIdentifier = mainAddon.split(/:(.+)/)[0];
  const addonJsonPath = path.join(addonsDir, mainAddonIdentifier, 'addon.json');
  const addonJson = JSON.parse(fs.readFileSync(addonJsonPath, 'utf8'));
  return addonJson.version_string;
}

async function cleanup(addonsDir, dependencies, mainAddon, baseDir) {
  console.log('Cleaning up addons...');

  const mainAddonIdentifier = mainAddon.split(/:(.+)/)[0];
  try {
    execSync(`php cmd.php xf-addon:uninstall ${mainAddonIdentifier} || true`, { cwd: baseDir, stdio: 'inherit' });
  } catch (ignore) {}
  const [mainVendor, mainName] = mainAddonIdentifier.split('/');
  fs.rmSync(path.join(addonsDir, mainVendor, mainName), { recursive: true, force: true });

  if (dependencies) {
    const deps = dependencies.split(',');
    for (const dep of deps) {
      const addonIdentifier = dep.split(/:(.+)/)[0];
      try {
        execSync(`php cmd.php xf-addon:uninstall ${addonIdentifier} || true`, { cwd: baseDir, stdio: 'inherit' });
      } catch (ignore) {}
      const [vendor, name] = addonIdentifier.split('/');
      fs.rmSync(path.join(addonsDir, vendor, name), { recursive: true, force: true });
    }
  }
}

module.exports = {
  preCleanup,
  prepareAddons,
  installAddons,
  buildAddon,
  getAddonVersion,
  cleanup,
};
