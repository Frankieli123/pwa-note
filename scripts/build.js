#!/usr/bin/env node

const { spawnSync } = require('child_process')
const { getAppVersion, writeVersionAssets } = require('./build-version')

const version = process.env.NEXT_PUBLIC_APP_VERSION || getAppVersion()
const env = { ...process.env, NEXT_PUBLIC_APP_VERSION: version }

console.log(`Building application version: ${version}`)
writeVersionAssets(version)

const nextBin = require.resolve('next/dist/bin/next')
const result = spawnSync(process.execPath, [nextBin, 'build'], {
  stdio: 'inherit',
  env,
})

if (result.error) {
  throw result.error
}

process.exit(result.status ?? 1)
