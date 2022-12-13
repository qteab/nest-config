import { Module, DynamicModule } from '@nestjs/common'
import { SecretManagerModule } from '@qte/nest-google-secret-manager'
import { ConfigReaderService } from './config-reader.service'
import { ConfigService } from './config.service'
import { EnvLoaderService } from './envloader.service'
import { CONFIG_OPTIONS_TOKEN } from './constants'
import { ConfigOptions } from './interfaces/options'
import { SecretLoaderService } from './secretloader.service'

@Module({})
export class ConfigModule {
  public static forRoot(configOptions: ConfigOptions): DynamicModule {
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
        {
          provide: CONFIG_OPTIONS_TOKEN,
          useValue: configOptions,
        },
      ],
      exports: [ConfigService],
    }
  }
}
