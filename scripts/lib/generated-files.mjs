import { mkdir, rename, writeFile } from 'node:fs/promises'
import path from 'node:path'

export async function writeJsonAtomically(filePath, value) {
  await mkdir(path.dirname(filePath), { recursive: true })
  const temporaryPath = `${filePath}.tmp`
  await writeFile(temporaryPath, `${JSON.stringify(value, null, 2)}\n`, 'utf8')
  await rename(temporaryPath, filePath)
}
