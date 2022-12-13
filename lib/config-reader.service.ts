import { Injectable } from '@nestjs/common'
import * as fs from 'fs/promises'
import * as path from 'path'
import * as YAML from 'yaml'
import { ConfigReadException } from './exceptions'

@Injectable()
export class ConfigReaderService {
  public async readConfigFile(filePath: string) {
    const resolvedFilePath = path.resolve(filePath)
    try {
      const file = await fs.readFile(resolvedFilePath, 'utf8')
      return YAML.parse(file)
    } catch (e) {
      if (e instanceof Error) {
        throw new ConfigReadException(`Could not read config at ${resolvedFilePath}, Error: ${e.message}`)
      }
      throw new ConfigReadException(`Could not read config at ${resolvedFilePath}, An unknown error occured`)
    }
  }
}
