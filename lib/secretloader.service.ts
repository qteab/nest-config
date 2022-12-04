import { Injectable } from '@nestjs/common'
import { SecretManagerService } from '@qte/nest-google-secret-manager'
import { SecretLoadException } from './exceptions'

@Injectable()
export class SecretLoaderService {
  constructor(private readonly secretManagerService: SecretManagerService) {}
  async loadSecret(secret: string, keyName: string) {
    try {
      const res = await this.secretManagerService.loadSecretDynamic(secret)
      return res
    } catch (e) {
      if (e instanceof Error) {
        throw new SecretLoadException(`Secret '${secret}' at '${keyName}' could not be loaded, error: ${e.message}`)
      }
      throw new SecretLoadException(`Secret '${secret}' at '${keyName}' could not be loaded, an unknown error occured`)
    }
  }
}
