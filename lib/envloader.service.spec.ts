import { EnvLoaderService } from './envloader.service'

describe('EnvLoaderService', () => {
  const env = process.env
  const envLoaderService = new EnvLoaderService()
  beforeEach(() => {
    jest.resetModules()
    process.env = { ...env }
  })

  it("Should return the env value if it's set", () => {
    process.env.MY_ENV = 'some-value'
    expect(envLoaderService.loadEnv('MY_ENV')).toEqual('some-value')
  })

  it('Should return undefined if the env value is not set', () => {
    process.env.MY_ENV = undefined
    expect(envLoaderService.loadEnv('MY_ENV')).toEqual(undefined)
  })

  afterEach(() => {
    process.env = env
  })
})
