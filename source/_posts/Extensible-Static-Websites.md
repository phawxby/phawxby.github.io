---
title: Extensible Static Websites
date: 2017-05-08 10:25:18
tags: development
---

*[How to integrate Hexo with Gulp and skip my rambling](#Hexo-Gulp)*

After attending a couple of Front End events recently I decided it was about time I started blogging. A lot of my day to day work requires interesting solutions to difficult problems, and I'm sure I can't be the only one suffering them. So I'm going to try and blog more regularly, plus go back and write some retrospective blog posts on past interesting stuff.

## The platform

I have a virtual private server with [Digital Ocean](https://m.do.co/c/e4a89ea04de5) and it's great, I can't recommend them highly enough. However for a simple blog it's a bit OTT. So I've elected to be lazy and use [GitHub pages](https://pages.github.com/). I get hosting, quite a lot of bandwidth and a CDN all for free. Excellent. 

Natively it uses [Jekyll](https://jekyllrb.com/) which I've used in the past for [single page sites](https://phawxby.github.io/multitouchjs/) but I want more flexibility. And what's more flexible than a generator that I can feed directly into a [Gulp](http://gulpjs.com/) pipeline!?

## [Hexo](https://hexo.io/) to the rescue

Hexo is a great static site generator with no dependencies other than [Node](https://nodejs.org/). This is exactly what I want, I don't want to worry about installing Ruby, Python or anything else. Just node. 

Plus it's pretty extensible out of the box, it has a lot of [plugins](https://hexo.io/plugins/) already available. 

But I want more! I'd like to feed it into a fully customisable Gulp pipeline. 

## Hexo + Gulp

The [Hexo API](https://hexo.io/api/) is pretty well documented, and as it's Node based it's a breeze to integrate into Gulp. 

I found [zhoujiealex previous work](https://gist.github.com/zhoujiealex/4d926889b02b85d4d8d73f036ef728eb) then expanded on it using filters to invoke gulp processes. [Skip to the bottom](Full-gulpfile-js) to see my full final solution, or just view the [source to this site](https://github.com/phawxby/phawxby.github.io/tree/source). 

### Tasks

Pull together your tasks and target them on the `./public` and `./.deploy_git` folders. This is where your content builds when you call `generate` and `deploy` respectively. Configure them however you would configure any other gulp task.

```js
gulp.task('minify-css', function() {
  return gulp.src(['./public/**/*.css', './.deploy_git/**/*.css'])
    .pipe(debug({title: 'minify-css:', showFiles: false}))
    .pipe(cssnano())
    .pipe(gulp.dest('./public'));
});
```

#### Laziness

Use run sequence to run all your post processing tasks in one command, just for laziness really. 

```js
gulp.task('compress', function(cb) {
  runSequence(['minify-html', 'minify-css', 'minify-js', 'minify-img'], cb);
});
```

### Hook it up

Hook up a Hexo filter to `after_generate` to run your gulp tasks. `after_generate` runs after every generation and before deployment if it's a deployment build.

It's important you return a Promise from the filter to delay deployment until after the Gulp tasks are complete. 

```js
var hexo = new Hexo(process.cwd(), {});
hexo.extend.filter.register('after_generate', function(){
  return new Promise(function(resolve, reject) {
    runSequence(['compress'], resolve);
  });
});
```

### Run the Hexo tasks

Obliviously this solution will only work when invoked through gulp, simply calling `hexo generate` for example will not hook up the filter to run the Gulp tasks. As a result we need to write simple wrapper tasks in gulp so we can call `gulp generate` instead which will allow the filters to be hooked up. 

```js
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
```

## Full `gulpfile.js`

```js
'use strict';

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
  });
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
  });
});

gulp.task('minify-css', function() {
  return gulp.src(['./public/**/*.css', './.deploy_git/**/*.css'])
    .pipe(debug({title: 'minify-css:', showFiles: false}))
    .pipe(cssnano())
    .pipe(gulp.dest('./public'));
});

gulp.task('minify-html', function() {
  return gulp.src(['./public/**/*.html', './.deploy_git/**/*.html'])
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
  return gulp.src(['./public/**/*.js', './.deploy_git/**/*.js'])
    .pipe(debug({title: 'minify-js:', showFiles: false}))
    .pipe(uglify())
    .pipe(gulp.dest('./public'));
});

gulp.task('minify-img', function() {
  return gulp.src(['./public/images/*', './.deploy_git/images/*'])
    .pipe(debug({title: 'minify-img:', showFiles: false}))
    .pipe(imagemin())
    .pipe(gulp.dest('./public/images'))
});

gulp.task('compress', function(cb) {
    runSequence(['minify-html', 'minify-css', 'minify-js', 'minify-img'], cb);
});

gulp.task('build', function(cb) {
    runSequence('clean', 'generate', 'compress', cb)
});
```