'use strict';

// Based on https://gist.github.com/zhoujiealex/4d926889b02b85d4d8d73f036ef728eb
let Promise = require('bluebird');
let gulp = require('gulp');
let cssnano = require('gulp-cssnano');
let uglify = require('gulp-uglify');
let htmlmin = require('gulp-htmlmin');
let htmlclean = require('gulp-htmlclean');
let imagemin = require('gulp-imagemin');
let del = require('del');
let runSequence = require('run-sequence');
let Hexo = require('hexo');
let debug = require('gulp-debug');

gulp.task('clean', function() {
    return del(['public/**/*']);
});

// generate html with 'hexo generate'
var hexo = new Hexo(process.cwd(), {});
hexo.extend.filter.register('after_generate', function(){
  return new Promise(function(resolve, reject) {
    runSequence(['compress'], resolve);
  });
});

gulp.task('generate', function(cb) {

  hexo.init().then(function() {
    return hexo.call('generate', {
      watch: false
    });
  }).then(function() {
    return hexo.exit();
  }).then(function() {
    return cb()
  }).catch(function(err) {
    console.log(err);
    hexo.exit(err);
    return cb(err);
  })
});

gulp.task('deploy', function(cb) {

  hexo.init().then(function() {
    return hexo.call('deploy', {
      watch: false
    });
  }).then(function() {
    return hexo.exit();
  }).then(function() {
    return cb()
  }).catch(function(err) {
    console.log(err);
    hexo.exit(err);
    return cb(err);
  })
});

gulp.task('minify-css', function() {
  return gulp.src(['./public/**/*.css', './deploy_git/**/*.css'])
    .pipe(debug({title: 'minify-css:', showFiles: false}))
    .pipe(cssnano())
    .pipe(gulp.dest('./public'));
});

gulp.task('minify-html', function() {
  return gulp.src(['./public/**/*.html', './deploy_git/**/*.html'])
    .pipe(debug({title: 'minify-html:', showFiles: false}))
    .pipe(htmlclean())
    .pipe(htmlmin({
      removeComments: true,
      minifyJS: true,
      minifyCSS: true,
      minifyURLs: true,
    }))
    .pipe(gulp.dest('./public'))
});

gulp.task('minify-js', function() {
  return gulp.src(['./public/**/*.js', './deploy_git/**/*.js'])
    .pipe(debug({title: 'minify-js:', showFiles: false}))
    .pipe(uglify())
    .pipe(gulp.dest('./public'));
});

gulp.task('minify-img', function() {
  return gulp.src(['./public/images/*', './deploy_git/images/*'])
    .pipe(debug({title: 'minify-img:', showFiles: false}))
    .pipe(imagemin())
    .pipe(gulp.dest('./public/images'))
})

gulp.task('compress', function(cb) {
    runSequence(['minify-html', 'minify-css', 'minify-js', 'minify-img'], cb);
});

gulp.task('build', function(cb) {
    runSequence('clean', 'generate', 'compress', cb)
});

gulp.task('default', [])