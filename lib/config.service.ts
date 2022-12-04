import { Inject, Injectable, OnModuleInit } from '@nestjs/common'
import path = require('path')
import { ConfigReaderService } from './config-reader.service'
import { CONFIG_OPTIONS_TOKEN, DEVELOPMENT, PRODUCTION, STAGING } from './constants'
import { ConfigOptions } from './interfaces/options'
import merge from 'ts-deepmerge'
import { z, ZodError } from 'zod'
import { ValidationException } from './exceptions'
import { EnvLoaderService } from './envloader.service'
import { SecretLoaderService } from './secretloader.service'

const secretRegex = /projects\/.*\/secrets\/.*\/versions\/.*/
const fromSchema = z
  .object({
    secret: z.string().regex(secretRegex),
    env: z.string(),
  })
  .partial()
  .refine(({ secret, env }) => (secret || env) && !(secret && env), 'secret or env needs to be specified, but not both') // XOR

const fromParentSchema = z
  .object({
    $from: fromSchema,
  })
  .strict()

@Injectable()
export class ConfigService implements OnModuleInit {
  private readonly options: ConfigOptions

  private config: unknown = {}
  constructor(
    private readonly configReaderService: ConfigReaderService,
    private readonly envLoaderService: EnvLoaderService,
    private readonly secretLoaderService: SecretLoaderService,
    @Inject(CONFIG_OPTIONS_TOKEN) options: ConfigOptions,
  ) {
    this.options = options
  }

  async onModuleInit() {
    await this.parseConfig()
  }

  public getConfig<T>(): T {
    return this.config as T
  }

  private async parseConfig() {
    const untransformedConfigs = await Promise.all(this.getFilesToRead().map((file) => this.configReaderService.readConfigFile(file)))
    const configs = await Promise.all(untransformedConfigs.filter((conf) => conf).map((conf) => this.recursvieTransformFrom(conf, '') || {}))
    const config = merge.withOptions({ mergeArrays: false }, ...configs)
    try {
      this.config = this.options.schema.strict().parse(config)
    } catch (e) {
      if (e instanceof ZodError) {
        throw new ValidationException(`Schema validation error, ${e.message}`)
      }
      throw new ValidationException(`Unknown schema validation error`)
    }
  }

  private getFilesToRead() {
    return ['index.yaml', this.getConfigFileNameForEnv()].map((fileName) => path.join(this.options.configPath || './config', fileName))
  }

  private getConfigFileNameForEnv() {
    switch (this.options.env) {
      case PRODUCTION:
        return 'env.production.yaml'
      case STAGING:
        return 'env.staging.yaml'
      case DEVELOPMENT:
        return 'env.development.yaml'
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private async recursvieTransformFrom(conf: any, keyName: string): Promise<any> {
    const config = JSON.parse(JSON.stringify(conf))
    if (config instanceof Object && !Array.isArray(config) && config) {
      const keys = Object.keys(config || {})
      if (config['$from']) {
        const result = fromParentSchema.safeParse(config)
        if (!result.success) {
          throw new ValidationException(`Schema validation error, ${result.error.message}`)
        }
        const fromParent = result.data
        if (fromParent.$from.secret) {
          const res = await this.secretLoaderService.loadSecret(fromParent.$from.secret, keyName)
          return res
        }
        if (fromParent.$from.env) {
          return this.envLoaderService.loadEnv(fromParent.$from.env)
        }
      }
      const promises = keys.map((key) => {
        return this.recursvieTransformFrom(config[key], `${keyName}.${key.toString()}`)
      })
      const returns = await Promise.all(promises)
      return returns.reduce((acc, curr, i) => {
        return {
          ...acc,
          [keys[i]]: curr,
        }
      }, {})
    }
    if (Array.isArray(config)) {
      const values = await Promise.all(config.map((k, i) => this.recursvieTransformFrom(k, `${keyName}[${i}]`)))
      return values
    }
    return config
  }
}
