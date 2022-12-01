import { SecretLoaderService } from './secretloader.service'
import { SecretManagerService } from '@qte/nest-google-secret-manager'
import { SecretLoadException } from './exceptions'
jest.mock('@qte/nest-google-secret-manager')
describe('SecretLoaderService', () => {
  beforeEach(() => {
    jest.resetAllMocks()
  })

  it('Returns value if SecretManager resolves', async () => {
    const secretManagerService = new SecretManagerService(null as any, null as any)
    ;(secretManagerService.loadSecretDynamic as jest.Mock).mockResolvedValueOnce('secret-value')
    const secretLoaderService = new SecretLoaderService(secretManagerService)
    await expect(secretLoaderService.loadSecret('some-secret', 'some-key')).resolves.toEqual('secret-value')
  })

  it('Throws a detailed error if SecretManager rejects', async () => {
    const secretManagerService = new SecretManagerService(null as any, null as any)
    ;(secretManagerService.loadSecretDynamic as jest.Mock).mockRejectedValueOnce(new Error('Some error'))
    const secretLoaderService = new SecretLoaderService(secretManagerService)
    await expect(secretLoaderService.loadSecret('some-secret', 'some-key')).rejects.toThrow(SecretLoadException)
  })

  it('Throws a generic error if SecretManager rejects with an unknown reason', async () => {
    const secretManagerService = new SecretManagerService(null as any, null as any)
    ;(secretManagerService.loadSecretDynamic as jest.Mock).mockRejectedValueOnce('not an instanceof Error')
    const secretLoaderService = new SecretLoaderService(secretManagerService)
    await expect(secretLoaderService.loadSecret('some-secret', 'some-key')).rejects.toThrow(SecretLoadException)
  })
})
