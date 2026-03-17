import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const versionFile = path.join(__dirname, 'version.json');
const packageFile = path.join(__dirname, 'package.json');
const buildGradleFile = path.join(__dirname, 'android', 'app', 'build.gradle');

function updateVersion() {
  const versionData = JSON.parse(fs.readFileSync(versionFile, 'utf-8'));
  const packageData = JSON.parse(fs.readFileSync(packageFile, 'utf-8'));
  
  // 检查package.json中的版本是否比version.json高
  const packageVersion = packageData.version;
  const versionJsonVersion = versionData.versionName;
  
  if (packageVersion !== versionJsonVersion) {
    // 以package.json为准，解析版本号
    const [pkgMajor, pkgMinor, pkgPatch] = packageVersion.split('.').map(Number);
    versionData.major = pkgMajor;
    versionData.minor = pkgMinor;
    versionData.patch = pkgPatch;
    console.log(`检测到版本不一致，以package.json为准: ${packageVersion}`);
  }
  
  let { major, minor, patch } = versionData;
  
  // 递增修订版本号
  patch = patch + 1;
  
  // 当修订版本 >= 次版本时，次版本+1，修订版本归零
  if (patch >= minor) {
    minor = minor + 1;
    patch = 0;
  }
  
  // 当次版本达到30时，主版本+1，次版本和修订版本归零
  if (minor >= 30) {
    major = major + 1;
    minor = 0;
    patch = 0;
  }
  
  const versionCode = major * 10000 + minor * 100 + patch;
  const versionName = `${major}.${minor}.${patch}`;
  
  versionData.major = major;
  versionData.minor = minor;
  versionData.patch = patch;
  versionData.versionCode = versionCode;
  versionData.versionName = versionName;
  
  fs.writeFileSync(versionFile, JSON.stringify(versionData, null, 2));
  
  // 更新package.json
  const newPackageData = JSON.parse(fs.readFileSync(packageFile, 'utf-8'));
  newPackageData.version = versionName;
  fs.writeFileSync(packageFile, JSON.stringify(newPackageData, null, 2));
  
  let buildGradleContent = fs.readFileSync(buildGradleFile, 'utf-8');
  buildGradleContent = buildGradleContent.replace(
    /versionCode \d+/,
    `versionCode ${versionCode}`
  );
  buildGradleContent = buildGradleContent.replace(
    /versionName "[\d.]+"/,
    `versionName "${versionName}"`
  );
  fs.writeFileSync(buildGradleFile, buildGradleContent);
  
  console.log(`版本已更新: ${versionName} (${versionCode})`);
  console.log(`主版本: ${major}, 次版本: ${minor}, 修订版本: ${patch}`);
}

updateVersion();