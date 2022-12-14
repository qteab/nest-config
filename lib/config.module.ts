import { Module, DynamicModule } from '@nestjs/common'
import { SecretManagerModule } from '@qte/nest-google-secret-manager'
import { ConfigReaderService } from './config-reader.service'
import { ConfigService } from './config.service'
import { EnvLoaderService } from './envloader.service'
import { CONFIG_OPTIONS_TOKEN, INIT_TOKEN } from './constants'
import { ConfigOptions } from './interfaces/options'
import { SecretLoaderService } from './secretloader.service'
import { GetConfigService } from './getconfig.service'

@Module({})
export class ConfigModule {
  public static async forRoot(configOptions: ConfigOptions): Promise<DynamicModule> {
    return {
      module: ConfigModule,
      global: true,
      imports: [
        SecretManagerModule.register({
          keyFile: configOptions.keyFile,
        }),
      ],
      providers: [
        ConfigService,
        ConfigReaderService,
        EnvLoaderService,
        SecretLoaderService,
        GetConfigService,
        {
          provide: CONFIG_OPTIONS_TOKEN,
          useValue: configOptions,
        },
        {
          provide: INIT_TOKEN,
          useFactory: async (configService: ConfigService) => {
            await configService.initModule()
            return null
          },
          inject: [ConfigService],
        },
      ],
      exports: [GetConfigService],
    }
  }
}
