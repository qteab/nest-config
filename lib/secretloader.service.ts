import { Injectable } from '@nestjs/common'
import { SecretManagerService } from '@qte/nest-google-secret-manager'
import * as fs from 'fs/promises'
import * as fsSync from 'fs'
import * as os from 'os'
import { SecretLoadException } from './exceptions'

@Injectable()
export class SecretLoaderService {
  constructor(private readonly secretManagerService: SecretManagerService) {}
  async loadSecret(secret: string, keyName: string, cache: boolean) {
    if (cache) {
      try {
        const cached = await this.readFromCache(secret)
        return cached
      } catch (e) {}
    }

    try {
      const res = await this.secretManagerService.loadSecretDynamic(secret)
      if (cache) {
        await this.writeToCache(secret, res)
      }
      return res
    } catch (e) {
      if (e instanceof Error) {
        throw new SecretLoadException(`Secret '${secret}' at '${keyName}' could not be loaded, error: ${e.message}`)
      }
      throw new SecretLoadException(`Secret '${secret}' at '${keyName}' could not be loaded, an unknown error occured`)
    }
  }

  private async readFromCache(secret: string) {
    const b64 = Buffer.from(secret).toString('base64')
    const dir = os.tmpdir()
    const data = await fs.readFile(`${dir}/nest-config/${b64}`, 'utf-8')
    return data
  }

  private async writeToCache(secret: string, value: string) {
    const b64 = Buffer.from(secret).toString('base64')
    const dir = os.tmpdir()
    if (!fsSync.existsSync(`${dir}/nest-config`)) {
      await fs.mkdir(`${dir}/nest-config`)
    }
    await fs.writeFile(`${dir}/nest-config/${b64}`, value, 'utf-8')
  }
}
