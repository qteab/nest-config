import { Injectable, Inject } from '@nestjs/common'
import { ConfigService } from './config.service'
import { INIT_TOKEN } from './constants'

@Injectable()
export class GetConfigService {
  constructor(private readonly configService: ConfigService, @Inject(INIT_TOKEN) token: null) {}

  public getConfig<T>(): T {
    return this.configService.getConfig<T>()
  }
}
