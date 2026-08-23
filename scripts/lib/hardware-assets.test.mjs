import { execFileSync } from 'node:child_process'
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'

import { afterEach, describe, expect, it } from 'vitest'

import { readAssetAtCommit } from './hardware-assets.mjs'

const temporaryDirectories = []

afterEach(async () => {
  await Promise.all(
    temporaryDirectories
      .splice(0)
      .map((directory) => rm(directory, { recursive: true, force: true })),
  )
})

describe('hardware asset reads', () => {
  it('reads the pinned git tree instead of a changed working-tree file', async () => {
    const repositoryPath = await mkdtemp(
      path.join(os.tmpdir(), 'ossm-configurator-assets-'),
    )
    temporaryDirectories.push(repositoryPath)
    execFileSync('git', ['init', repositoryPath])
    const sourcePath = path.join(repositoryPath, 'part.stl')
    await writeFile(sourcePath, Buffer.from('locked model'))
    execFileSync('git', ['-C', repositoryPath, 'add', 'part.stl'])
    execFileSync(
      'git',
      [
        '-C',
        repositoryPath,
        '-c',
        'user.name=Catalog Test',
        '-c',
        'user.email=catalog@example.invalid',
        'commit',
        '-m',
        'fixture',
      ],
      { stdio: 'ignore' },
    )
    const commit = execFileSync('git', [
      '-C',
      repositoryPath,
      'rev-parse',
      'HEAD',
    ])
      .toString()
      .trim()
    await writeFile(sourcePath, Buffer.from('dirty model'))

    expect(
      readAssetAtCommit(repositoryPath, commit, 'part.stl').toString(),
    ).toBe('locked model')
  })

  it('includes the locked path in a missing-object error', async () => {
    const repositoryPath = await mkdtemp(
      path.join(os.tmpdir(), 'ossm-configurator-assets-'),
    )
    temporaryDirectories.push(repositoryPath)
    execFileSync('git', ['init', repositoryPath])

    expect(() =>
      readAssetAtCommit(repositoryPath, '0'.repeat(40), 'missing model.stl'),
    ).toThrow(/0{40}:missing model\.stl/)
  })
})
