import fs from 'fs'
import path from 'path'

const files = fs.readdirSync('./').filter(file => /(?<!\.(test|config))\.js$/.test(file))

export default files.map(file => ({
  input: file,
  output: {
    file: path.join('./dist', file.slice(0, -3) + '.cjs'),
    format: 'cjs',
    paths: /** @param {any} path */ path => {
      if (/^lib0\//.test(path)) {
        return `lib0/dist/${path.slice(5, -3) + '.cjs'}`
      }
      return path
    }
  }
}))
