import { z } from 'zod'
import { PRODUCTION, STAGING, DEVELOPMENT } from '../constants'

export type Environment = typeof PRODUCTION | typeof STAGING | typeof DEVELOPMENT

export interface ConfigOptions {
  // GCP Key file
  keyFile?: string
  // Defaults to ../config
  configPath?: string
  env: Environment
  schema: z.AnyZodObject
}
