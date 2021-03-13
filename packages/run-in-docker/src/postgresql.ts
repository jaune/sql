import Docker from 'dockerode'
import { emptyDir } from 'fs-extra'
import { dir as tmp } from 'tmp-promise'

interface Config {
  database: string
  user: string
  password: string
  host: string
  port: number
}

const runPostgresqlInDocker = async <R>(
  cb: (cfg: Config) => Promise<R | undefined>
) => {
  let result = undefined

  const postfix = Date.now().toString(36)
  const database = `postgres-db-${postfix}`
  const user = `postgres-user-${postfix}`
  const password = `pa$$w0rd-${postfix}`
  const name = `db-generate-schema-${postfix}`

  // console.info('tmp: creating directory...')
  const { path: volumePath, cleanup: cleanupVolume } = await tmp({})
  // console.info('tmp: directory created!')

  // console.info('docker: connecting...')
  const docker = new Docker({})
  // console.info('docker: connected!')

  // console.info(`docker: creating postgres container... name=${name}`)
  const postgresContainer = await docker.createContainer({
    name,
    Image: 'postgres:13-alpine',
    ExposedPorts: {
      '5432/tcp': {},
    },
    HostConfig: {
      PortBindings: {
        '5432/tcp': [{ HostPort: '' }],
      },
      Mounts: [
        {
          Target: '/var/lib/postgresql/data',
          Source: volumePath,
          Type: 'bind',
          ReadOnly: false,
        },
      ],
    },
    Env: [
      `POSTGRES_PASSWORD=${password}`,
      `POSTGRES_USER=${user}`,
      `POSTGRES_DB=${database}`,
    ],
  })
  // console.info('docker: postgres container created!')

  let threwError = null

  try {
    // console.info('docker: starting postgres container...')
    await postgresContainer.start()
    // console.info('docker: postgres container started!')

    try {
      const info = await postgresContainer.inspect()
      const network = info.NetworkSettings.Ports['5432/tcp']?.[0] || null

      if (!network) {
        throw new Error('No binding found for 5432/tcp')
      }

      await new Promise((resolve) => {
        setTimeout(() => {
          resolve(null)
        }, 30 * 1000)
      })

      const dbConfig = {
        database,
        user,
        password,
        host: network.HostIp === '0.0.0.0' ? 'localhost' : network.HostIp,
        port: parseInt(network.HostPort, 10),
      }

      result = await cb(dbConfig)
    } catch (error) {
      // console.error(error)
      threwError = error
    }

    // console.info('docker: stoping postgres container...')
    await postgresContainer.stop()
    // console.info('docker: postgres container stoped!')
  } catch (error) {
    // console.error(error)
    threwError = error
  }

  // console.info('docker: removing postgres container...')
  await postgresContainer.remove()
  // console.info('docker: postgres container removed!')

  // console.info('tmp: removing directory content...')
  await emptyDir(volumePath)
  // console.info('tmp: directory content removed!')

  // console.info('tmp: removing directory...')
  await cleanupVolume()
  // console.info('tmp: directory removed!')

  if (threwError) {
    throw threwError
  }

  return result
}

export default runPostgresqlInDocker
