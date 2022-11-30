import { Test } from '@nestjs/testing'
import { z } from 'zod'
import { ConfigReaderService } from './config-reader.service'
import { ConfigModule } from './config.module'
import { ConfigService } from './config.service'
import { DEVELOPMENT } from './constants'
import { EnvLoaderService } from './envloader.service'
import { ConfigReadException, ValidationException } from './exceptions'
import { SecretLoaderService } from './secretloader.service'

jest.mock('./config-reader.service.ts')
jest.mock('./envloader.service.ts')
jest.mock('./secretloader.service.ts')
describe('ConfigService', () => {
  let configService: ConfigService
  let mockedConfigReaderService: ConfigReaderService
  let mockedEnvLoaderService: EnvLoaderService
  let mockedSecretLoaderService: SecretLoaderService
  const schema = z.object({
    foo: z.number(),
    obj: z.optional(
      z.object({
        key1: z.string(),
        key2: z.string(),
      }),
    ),
    from: z.optional(z.string()),
    list: z.optional(z.array(z.string())),
  })
  type SchemaT = z.infer<typeof schema>
  beforeEach(async () => {
    mockedConfigReaderService = new ConfigReaderService()
    mockedEnvLoaderService = new EnvLoaderService()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mockedSecretLoaderService = new SecretLoaderService(null as any)
    jest.resetAllMocks()
    const moduleRef = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          env: DEVELOPMENT,
          schema: schema,
        }),
      ],
    })
      .overrideProvider(ConfigReaderService)
      .useValue(mockedConfigReaderService)
      .overrideProvider(EnvLoaderService)
      .useValue(mockedEnvLoaderService)
      .overrideProvider(SecretLoaderService)
      .useValue(mockedSecretLoaderService)
      .compile()

    configService = moduleRef.get<ConfigService>(ConfigService)
  })

  it('Can parse a basic config', async () => {
    ;(mockedConfigReaderService.readConfigFile as jest.Mock).mockImplementation(() => {
      return Promise.resolve({
        foo: 1,
      })
    })

    await configService.onModuleInit()
    const config = configService.getConfig<SchemaT>()
    expect(config).toStrictEqual({
      foo: 1,
    })
  })

  it('Overrides configs in the right order', async () => {
    ;(mockedConfigReaderService.readConfigFile as jest.Mock).mockImplementation((filePath: string) => {
      if (filePath === 'config/index.yaml') {
        return Promise.resolve({
          foo: 1,
        })
      }
      return Promise.resolve({
        foo: 5,
      })
    })

    await configService.onModuleInit()
    const config = configService.getConfig<SchemaT>()
    expect(config).toStrictEqual({
      foo: 5,
    })
  })

  it('Does not override nested keys', async () => {
    ;(mockedConfigReaderService.readConfigFile as jest.Mock).mockImplementation((filePath: string) => {
      if (filePath === 'config/index.yaml') {
        return Promise.resolve({
          foo: 1,
          obj: {
            key1: 'foo',
          },
        })
      }
      return Promise.resolve({
        foo: 5,
        obj: {
          key2: 'bar',
        },
      })
    })

    await configService.onModuleInit()
    const config = configService.getConfig<SchemaT>()
    expect(config).toStrictEqual({
      foo: 5,
      obj: {
        key1: 'foo',
        key2: 'bar',
      },
    })
  })

  it('Throws on unknown keys', async () => {
    ;(mockedConfigReaderService.readConfigFile as jest.Mock).mockImplementation(() => {
      return Promise.resolve({
        foo: 5,
        obj: {
          key2: 'bar',
        },
        fakeKey: 1,
      })
    })

    await expect(configService.onModuleInit()).rejects.toThrow(ValidationException)
  })

  it('Throws if file reading fails', async () => {
    ;(mockedConfigReaderService.readConfigFile as jest.Mock).mockImplementation(() => {
      return Promise.reject(new ConfigReadException('Failed to read file'))
    })

    await expect(configService.onModuleInit()).rejects.toThrow(ConfigReadException)
  })

  it('Can load secret', async () => {
    ;(mockedConfigReaderService.readConfigFile as jest.Mock).mockImplementation(() => {
      return Promise.resolve({
        foo: 1,
        from: {
          $from: {
            secret: 'projects/some-project/secrets/some-secret/versions/latest',
          },
        },
      })
    })
    ;(mockedSecretLoaderService.loadSecret as jest.Mock).mockResolvedValue('super-secret-value')
    await configService.onModuleInit()
    const config = configService.getConfig<SchemaT>()
    expect(config).toStrictEqual({
      foo: 1,
      from: 'super-secret-value',
    })
  })

  it('Can load env', async () => {
    ;(mockedConfigReaderService.readConfigFile as jest.Mock).mockImplementation(() => {
      return Promise.resolve({
        foo: 1,
        from: {
          $from: {
            env: 'FAKE_ENV',
          },
        },
      })
    })
    ;(mockedEnvLoaderService.loadEnv as jest.Mock).mockReturnValue('env-value')
    await configService.onModuleInit()
    const config = configService.getConfig<SchemaT>()
    expect(config).toStrictEqual({
      foo: 1,
      from: 'env-value',
    })
  })

  it('Throws if both env and secret is set', async () => {
    ;(mockedConfigReaderService.readConfigFile as jest.Mock).mockImplementation(() => {
      return Promise.resolve({
        foo: 1,
        from: {
          $from: {
            env: 'FAKE_ENV',
            secret: 'projects/some-project/secrets/some-secret/versions/latest',
          },
        },
      })
    })
    ;(mockedEnvLoaderService.loadEnv as jest.Mock).mockReturnValue('env-value')
    ;(mockedSecretLoaderService.loadSecret as jest.Mock).mockResolvedValue('super-secret-value')
    await expect(configService.onModuleInit()).rejects.toThrow(ValidationException)
  })

  it('Throws if $from is in an object with more keys', async () => {
    ;(mockedConfigReaderService.readConfigFile as jest.Mock).mockImplementation(() => {
      return Promise.resolve({
        foo: 1,
        from: {
          $from: {
            env: 'FAKE_ENV',
          },
          other: 'value',
        },
      })
    })
    ;(mockedEnvLoaderService.loadEnv as jest.Mock).mockReturnValue('env-value')
    await expect(configService.onModuleInit()).rejects.toThrow(ValidationException)
  })

  it('Throws on bad secret format', async () => {
    ;(mockedConfigReaderService.readConfigFile as jest.Mock).mockImplementation(() => {
      return Promise.resolve({
        foo: 1,
        from: {
          $from: {
            secret: 'bad-format',
          },
        },
      })
    })
    ;(mockedSecretLoaderService.loadSecret as jest.Mock).mockResolvedValue('super-secret-value')
    await expect(configService.onModuleInit()).rejects.toThrow(ValidationException)
  })

  it('Can load env and secret in list', async () => {
    ;(mockedConfigReaderService.readConfigFile as jest.Mock).mockImplementation(() => {
      return Promise.resolve({
        foo: 1,
        list: [
          {
            $from: {
              env: 'SOME_ENV',
            },
          },
          {
            $from: {
              secret: 'projects/some-project/secrets/some-secret/versions/latest',
            },
          },
        ],
      })
    })
    ;(mockedSecretLoaderService.loadSecret as jest.Mock).mockResolvedValue('super-secret-value')
    ;(mockedEnvLoaderService.loadEnv as jest.Mock).mockReturnValue('env-value')
    await configService.onModuleInit()
    const config = configService.getConfig<SchemaT>()
    expect(config).toStrictEqual({
      foo: 1,
      list: ['env-value', 'super-secret-value'],
    })
  })

  it('Overrides env and secrets correctly', async () => {
    ;(mockedConfigReaderService.readConfigFile as jest.Mock).mockImplementation((fileName: string) => {
      if (fileName === 'config/index.yaml') {
        return Promise.resolve({
          foo: 1,
          from: {
            $from: {
              env: 'SOME_ENV',
            },
          },
        })
      }
      return Promise.resolve({
        foo: 1,
        from: {
          $from: {
            secret: 'projects/some-project/secrets/some-secret/versions/latest',
          },
        },
      })
    })
    ;(mockedSecretLoaderService.loadSecret as jest.Mock).mockResolvedValue('super-secret-value')
    ;(mockedEnvLoaderService.loadEnv as jest.Mock).mockReturnValue('env-value')
    await configService.onModuleInit()
    const config = configService.getConfig<SchemaT>()
    expect(config).toStrictEqual({
      foo: 1,
      from: 'super-secret-value',
    })
  })
})
