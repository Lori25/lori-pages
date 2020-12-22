#!/usr/bin/env node

// console.log('lori-pages working');

process.argv.push('--cwd')
process.argv.push(process.cwd())
process.argv.push('--gulpfile')
process.argv.push(require.resolve('..'))
// process.argv.push(require.resolve('../lib/index'))
// console.log(process.argv)
require('gulp/bin/gulp')
