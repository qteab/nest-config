import { Injectable } from '@nestjs/common'

@Injectable()
export class EnvLoaderService {
  loadEnv(env: string) {
    const value = process.env[env]
    return value
  }
}
