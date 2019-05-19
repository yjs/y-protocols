import fs from 'fs'
import path from 'path'

const files = fs.readdirSync('./').filter(file => /(?<!\.(test|config))\.js$/.test(file))

export default files.map(file => ({
  input: file,
  output: {
    file: path.join('./dist', file),
    format: 'cjs',
    paths: path => {
      if (/^lib0\//.test(path)) {
        return `lib0/dist/${path.slice(5)}`
      }
      return path
    }
  }
}))
