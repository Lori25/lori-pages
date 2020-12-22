// 实现这个项目的构建任务

const { src, dest, series, parallel, watch } = require("gulp")

// 手动加载插件
// const sass = require('gulp-sass')
// const babel = require('gulp-babel')
// const swig = require('gulp-swig')
// const magemin = require('gulp-imagemin') // c++
// 自动加载插件
const loadPlugins = require('gulp-load-plugins')
const plugins = loadPlugins()

const path = require('path')
const del = require('del')  // 清除文件
const browserSync = require('browser-sync')  // 服务器
const bs = browserSync.create()

const cwd = process.cwd()
let config = {
  build: {
    src: 'src',
    dist: 'dist',
    temp: 'temp',
    public: 'public',
    paths: {
      style: 'assets/styles/*.scss',
      script: 'assets/scripts/*.js',
      page: '*.html',
      image: 'assets/images/**',
      font: 'assets/fonts/**'
    }
  },
  port: 2000,
  gitBranch: 'master'
}

try {
  const loadConfig = require(path.join(cwd, 'pages.config.js'))
  config = Object.assign({}, config, loadConfig)
} catch(e) {}

console.log(config)
const clean = () => {
  return del([config.build.dist, config.build.temp])  // 返回的是 promise 
}

const cleanTmp = () => {
  return del(config.build.temp)
}

const style = () => {
  // src 配置参数，base 指定路径基准
  return src(config.build.paths.style, { base: config.build.src, cwd: config.build.src })
    .pipe(plugins.sass({ outputStyle: 'expanded' }))   // 不转换 _ 开头的 sass 文件，sass 认为 _ 开头的文件是依赖文件;  outputStyle 可设置花括号形式
    .pipe(dest(config.build.temp))
    .pipe(bs.reload({ stream: true }))
}

const script = () => {
  // return src('src/assets/scripts/*.js', { base: 'src' })
  return src(config.build.paths.script, { base: config.build.src, cwd: config.build.src })
  .pipe(plugins.babel({ presets: [require('@babel/preset-env')] }))
    .pipe(dest(config.build.temp))
    .pipe(bs.reload({ stream: true }))
}

const page = () => {
  // return src('src/*.html', { base: 'src'})  // ** 通配符会匹配子目录下的文件
  return src(config.build.paths.page, { base: config.build.src, cwd: config.build.src })
  .pipe(plugins.swig({ data: config.data }))
  // .pipe(plugins.swig({ data: config.data, defaults: { cache: false } })) // 防止模板缓存导致页面不能及时更新
    .pipe(dest(config.build.temp))
    .pipe(bs.reload({ stream: true }))
}

const image = () => {
  // return src('src/assets/images/**', { base: 'src' })
  return src(config.build.paths.image, { base: config.build.src, cwd: config.build.src })
  .pipe(plugins.imagemin())
    .pipe(dest(config.build.dist))
}

const font = () => {
  // return src('src/assets/fonts/**', { base: 'src' })
  return src(config.build.paths.font, { base: config.build.src, cwd: config.build.src })
  .pipe(plugins.imagemin())
    .pipe(dest(config.build.dist))
}

const extra = () => {
  // return src('public/**', { base: 'public' })
  return src('**', { base: config.build.public, cwd: config.build.public })
  .pipe(dest(config.build.dist))
}

const lint = () => {
  // 代码检查
  return src('**/*.js', { base: config.build.src, cwd: config.build.src })
    .pipe(plugins.eslint({ 
      rules: {
        'no-alert': 2,
        'no-empty': 2,
        'camelcase': 1,
        'quotes': 1,
        'no-console': 1,
      },
      env: {
        'es6': true,
        'node': true,
        'jquery': true,
        'browser': true
      }
     }))
    .pipe(plugins.eslint.format())
    .pipe(plugins.eslint.failAfterError());
}

const finalDeploy = () => {
  // console.log("dist dir ", config.build.dist)
  return src('**/*', { cwd: config.build.dist})
    // .pipe(console.log)
    .pipe(plugins.ghPages({
      branch: config.gitBranch
    }))
}

const serve = () => {
  // 源文件修改监听
  watch(config.build.paths.style, { cwd: config.build.src }, style)
  watch(config.build.paths.script, { cwd: config.build.src }, script)
  watch(config.build.paths.page, { cwd: config.build.src }, page)
  // 开发阶段对 图片、字体、其他内容不需要参与构建，否则加大了开销
  // watch('src/assets/images/**', image)
  // watch('src/assets/fonts/**', font)
  // watch('public/**', extra)
  watch([
    // 'src/assets/images/**',
    // 'src/assets/fonts/**',
    config.build.paths.image,
    config.build.paths.font,
    // 'public/**',
  ], { cwd: config.build.src }, bs.reload)
  watch('**', { cwd: config.build.src }, bs.reload )

  bs.init({
    notify: false,  // 取消提醒
    port: config.port,
    // open: false,  // 取消自动打开浏览器
    // files: 'dist/**',  // 监听文件修改
    server: {
      baseDir: [config.build.temp, config.build.src, config.build.public],  // 会依次往后找文件
      routes: {  // 优先于 baseDir 的配置
        '/node_modules': 'node_modules'
      }
    }
  })
}

const useref = () => {
  return src(config.build.paths.page, { base: config.build.temp, cwd: config.build.temp})
    .pipe(plugins.useref({ searchPath: [config.build.temp, '.', '../'] }))
    .pipe(plugins.if(/\.js$/, plugins.uglify()))
    .pipe(plugins.if(/\.css$/, plugins.cleanCss()))
    .pipe(plugins.if(/\.html$/, plugins.htmlmin({ 
      collapseWhitespace: true,
      minifyCSS: true,
      minifyJS: true
    })))
    .pipe(dest(config.build.dist))
}

const compile = parallel( style, script, page )
// 展开任务，更清晰
const build = series(
  clean, 
  parallel(
    series(compile, useref), 
    extra, 
    image, 
    font
  ),
  cleanTmp
) 
// 开发阶段
const dev = series(compile, serve)
// 部署
const deploy = series(build, finalDeploy)

module.exports = {
  // style,
  // script,
  // page
  // compile,
  clean,
  build,
  // serve,
  dev,
  lint,
  deploy
  // useref
} 