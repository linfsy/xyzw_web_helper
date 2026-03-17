#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 读取package.json
const packageJsonPath = path.join(__dirname, '..', 'package.json');
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

// 读取build.gradle
const buildGradlePath = path.join(__dirname, '..', 'android', 'app', 'build.gradle');
const buildGradleContent = fs.readFileSync(buildGradlePath, 'utf8');

// 获取当前版本
const currentVersion = packageJson.version;
console.log(`当前版本: ${currentVersion}`);

// 解析版本号
const versionParts = currentVersion.split('.').map(Number);
// 递增minor版本
versionParts[1] += 1;
// 重置patch版本
versionParts[2] = 0;
// 生成新版本号
const newVersion = versionParts.join('.');
console.log(`新版本: ${newVersion}`);

// 更新package.json
packageJson.version = newVersion;
fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2) + '\n');
console.log('✓ 更新了 package.json');

// 提取versionCode
let newVersionCode;
const versionCodeMatch = buildGradleContent.match(/versionCode\s+(\d+)/);
if (versionCodeMatch) {
    const currentVersionCode = parseInt(versionCodeMatch[1]);
    newVersionCode = currentVersionCode + 1;
    console.log(`当前versionCode: ${currentVersionCode}`);
    console.log(`新版本versionCode: ${newVersionCode}`);
    
    // 生成新的build.gradle内容
    let newBuildGradleContent = buildGradleContent
        .replace(/versionCode\s+\d+/, `versionCode ${newVersionCode}`)
        .replace(/versionName\s+"[^"]+"/, `versionName "${newVersion.substring(0, 3)}"`);
    
    // 写入build.gradle
    fs.writeFileSync(buildGradlePath, newBuildGradleContent);
    console.log('✓ 更新了 build.gradle');
} else {
    console.error('✗ 无法找到versionCode');
    process.exit(1);
}

console.log('\n版本更新完成！');
console.log(`新版本: ${newVersion}`);
console.log(`新versionCode: ${newVersionCode}`);
