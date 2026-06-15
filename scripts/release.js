// scripts/release.js
const { execSync } = require('child_process')
const readline = require('readline')
const fs = require('fs')

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
})

// 读取当前版本
const packageJson = JSON.parse(fs.readFileSync('./package.json', 'utf8'))
const currentVersion = packageJson.version

console.log(`当前版本: v${currentVersion}`)

// 询问新版本号
rl.question('请输入新版本号 (例如: 1.0.1): ', (newVersion) => {
  if (!newVersion) {
    console.log('版本号不能为空')
    rl.close()
    return
  }

  // 更新 package.json
  packageJson.version = newVersion
  fs.writeFileSync('./package.json', JSON.stringify(packageJson, null, 2))
  console.log(`✅ 版本已更新到 v${newVersion}`)

  // 提交更改
  try {
    execSync('git add package.json', { stdio: 'inherit' })
    execSync(`git commit -m "chore: bump version to v${newVersion}"`, { stdio: 'inherit' })
    execSync(`git tag v${newVersion}`, { stdio: 'inherit' })
    execSync('git push origin main --tags', { stdio: 'inherit' })
    console.log(`✅ 已推送 v${newVersion} 到 GitHub`)
    console.log(`🎉 GitHub Actions 将自动构建并发布`)
  } catch (error) {
    console.error('❌ 发布失败:', error)
  }

  rl.close()
})