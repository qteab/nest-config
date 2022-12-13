import { Injectable } from '@nestjs/common'

@Injectable()
export class EnvLoaderService {
  public loadEnv(env: string) {
    const value = process.env[env]
    return value
  }
}
