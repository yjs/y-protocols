import fs from 'fs'

const files = fs.readdirSync('./').filter(file => /(?<!\.(test|config))\.js$/.test(file))

export default {
  input: files,
  output: {
    dir: './dist',
    format: 'cjs',
    paths: path => {
      if (/^lib0\//.test(path)) {
        return `lib0/dist/${path.slice(5)}`
      }
      return path
    }
  }
}
