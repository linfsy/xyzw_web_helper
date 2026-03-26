#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { exec } from 'child_process';

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
// 递增patch版本
versionParts[2] += 1;
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
        .replace(/versionName\s+"[^"]+"/, `versionName "${newVersion}"`);
    
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

console.log('\n开始构建Debug版本APK...');

// 构建debug版本APK
const androidPath = path.join(__dirname, '..', 'android');
exec('gradlew.bat assembleDebug', { cwd: androidPath }, (error, stdout, stderr) => {
    if (error) {
        console.error(`构建失败: ${error.message}`);
        process.exit(1);
    }
    
    console.log(stdout);
    if (stderr) {
        console.error(stderr);
    }
    
    console.log('\n✅ Debug版本APK构建完成！');
    console.log(`文件位置: android/app/build/outputs/apk/debug/app-debug.apk`);
    
    // 打开APK所在目录
    const apkPath = path.join(__dirname, '..', 'android', 'app', 'build', 'outputs', 'apk', 'debug');
    exec(`explorer.exe "${apkPath}"`, (err) => {
        if (err) {
            console.error('无法打开目录:', err);
        } else {
            console.log('✓ 已打开APK所在目录');
        }
    });
});
