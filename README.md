# @qte/nest-config
A module for advanced configurations in Nest, supporting YAML, Env values, and Google Secret Manager secrets.
The module aims to provide flexibility, while also providing a great deal of safety. One of the guiding principles is to fail fast. The module will throw early errors crashing the application if anything goes wrong.

## Installation

```bash
$ yarn add @qte/nest-config
```

Note that `zod` is a peer-dependency and must be installed separately.

## Quick start
Import and use the module with a list of secrets to preload.
```ts
import { ConfigModule, ConfigService, DEVELOPMENT } from '@qte/nest-config'
import { z } from 'zod'

const mySchema = z.object({
  port: z.number()
})
type Config = z.infer<typeof mySchema>

// The module is global
ConfigModule.forRoot({
  env: DEVELOPMENT,
  schema: mySchema,
  configPath: './config' // Optional argument, defaults to the ./config directory relative to the running node process
})

// Later on in any other Nest provider or controller
const myConfig = ConfigService.getConfig<Config>()
```

You must create the following files
```bash
touch ./config/index.yaml # This is your base configuration
touch ./config/env.development.yaml # This file is loaded if env is DEVELOPMENT
touch ./config/env.staging.yaml # This file is loaded if env is STAGING
touch ./config/env.production.yaml # This file is loaded if env is PRODUCTION
```

The final configuration is built from first parsing `index.yaml`, then merging it with the environment specific configuration.

### Duplicate keys
Duplicate object keys are merged recursively, while all other duplicates are overriden, and the environment configuration is prioritised.

### Env and Secrets
Configuration files can contain `ENV` values and Google Secrets Manager secrets. See examples below
```yaml
database:
  host:
    $from:
      env: DATABASE_ENV # Will read PROCESS.ENV.DATABASE_ENV
  password:
    $from:
      secret: projects/some-gcp-project/secrets/some-secret/versions/latest # Will read the secret from GCP
```

the parsed configuration will match the following schema
```ts
z.object({
  database: z.object({
    host: z.string(),
    password: z.string(),
  }),
})
```


## License
@qte/nest-config is [MIT licensed](LICENSE).