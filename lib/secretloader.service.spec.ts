import { SecretLoaderService } from './secretloader.service'
import { SecretManagerService } from '@qte/nest-google-secret-manager'
import { SecretLoadException } from './exceptions'
import { v4 } from 'uuid'

jest.mock('@qte/nest-google-secret-manager')
describe('SecretLoaderService', () => {
  beforeEach(() => {
    jest.resetAllMocks()
  })

  it('Returns value if SecretManager resolves', async () => {
    const secretManagerService = new SecretManagerService(null as any, null as any)
    ;(secretManagerService.loadSecretDynamic as jest.Mock).mockResolvedValueOnce('secret-value')
    const secretLoaderService = new SecretLoaderService(secretManagerService)
    await expect(secretLoaderService.loadSecret('some-secret', 'some-key', false)).resolves.toEqual('secret-value')
  })

  it('Throws a detailed error if SecretManager rejects', async () => {
    const secretManagerService = new SecretManagerService(null as any, null as any)
    ;(secretManagerService.loadSecretDynamic as jest.Mock).mockRejectedValueOnce(new Error('Some error'))
    const secretLoaderService = new SecretLoaderService(secretManagerService)
    await expect(secretLoaderService.loadSecret('some-secret', 'some-key', false)).rejects.toThrow(SecretLoadException)
  })

  it('Throws a generic error if SecretManager rejects with an unknown reason', async () => {
    const secretManagerService = new SecretManagerService(null as any, null as any)
    ;(secretManagerService.loadSecretDynamic as jest.Mock).mockRejectedValueOnce('not an instanceof Error')
    const secretLoaderService = new SecretLoaderService(secretManagerService)
    await expect(secretLoaderService.loadSecret('some-secret', 'some-key', false)).rejects.toThrow(SecretLoadException)
  })

  it('Caches loaded secrets if cache is true', async () => {
    const secretName = v4()
    const secretManagerService = new SecretManagerService(null as any, null as any)
    ;(secretManagerService.loadSecretDynamic as jest.Mock).mockResolvedValueOnce('secret-value')
    const secretLoaderService = new SecretLoaderService(secretManagerService)
    await expect(secretLoaderService.loadSecret(secretName, 'some-key', true)).resolves.toEqual('secret-value')
    await expect(secretLoaderService.loadSecret(secretName, 'some-key', true)).resolves.toEqual('secret-value')
    expect(secretManagerService.loadSecretDynamic).toHaveBeenCalledTimes(1)
  })

  it('Does not cache secrets if cache is false', async () => {
    const secretName = v4()
    const secretManagerService = new SecretManagerService(null as any, null as any)
    ;(secretManagerService.loadSecretDynamic as jest.Mock).mockResolvedValue('secret-value')
    const secretLoaderService = new SecretLoaderService(secretManagerService)
    await expect(secretLoaderService.loadSecret(secretName, 'some-key', false)).resolves.toEqual('secret-value')
    await expect(secretLoaderService.loadSecret(secretName, 'some-key', false)).resolves.toEqual('secret-value')
    expect(secretManagerService.loadSecretDynamic).toHaveBeenCalledTimes(2)
  })
})
