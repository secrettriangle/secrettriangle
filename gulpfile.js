var gulp = require('gulp');
var gutil = require('gulp-util');
var source = require('vinyl-source-stream');
var buffer = require('vinyl-buffer');
var sourcemaps = require('gulp-sourcemaps');
var Promise = require('bluebird');

var fs = Promise.promisifyAll(require('fs'));
var path = require('path');

// js
var browserify = require('browserify');
var watchify = require('watchify');
var uglify = require('gulp-uglify');
var isogram = require('isogram');
var str = require('string-to-stream');

// css
var less = require('gulp-less');
var postcss = require('gulp-postcss');
var nano = require('cssnano');
var uncss = require('gulp-uncss');

// fonts
var flatten = require('gulp-flatten');

// html
var inlinesource = require('gulp-inline-source');
var htmlmin = require('gulp-htmlmin');

// pdf
var theme = require('jsonresume-theme-briefstrap');
var pdf = require('html-pdf');

var resume = require('./resume');

var src = 'src/';
var dist = 'dist/';

var watching = false;
var b = watchify(browserify(watchify.args))
  .add(src+'index.js')
  .add(str(isogram({id: 'UA-63592021-1'})))
  .on('log', gutil.log);

function bundle () {
  return b.bundle()
    .on('error', gutil.log.bind(gutil, 'Browserify Error'))
    .pipe(source('index.js'))
    .pipe(buffer())
    .pipe(sourcemaps.init({loadMaps: true})) // loads map from browserify file
      // Add transformation tasks to the pipeline here
      .pipe(uglify({compress: {drop_debugger: false}}))
      .on('error', gutil.log)
    .pipe(sourcemaps.write('.'))
    .pipe(gulp.dest(dist))
    .on('end', function () { if (!watching) b.close(); });
};
gulp.task('build-js', bundle);
gulp.task('build-fonts', function () {
  return gulp.src('**/*.{ttf,woff,woff2,eof,svg}')
    .pipe(flatten())
    .pipe(gulp.dest(path.join(dist, 'fonts')));
});
gulp.task('build-css', function () {
  return gulp.src(src+'index.less')
    .pipe(sourcemaps.init())
      // Add transformation tasks to the pipeline here
      .pipe(less())
      .pipe(uncss({html: [src+'index.html']}))
      .pipe(postcss([nano]))
      .on('error', gutil.log)
    .pipe(sourcemaps.write('.'))
    .pipe(gulp.dest(dist));
});
gulp.task('build-html', ['build-js', 'build-css', 'build-fonts'], function () {
  return gulp.src(src+'index.html')
    .pipe(inlinesource())
    .pipe(htmlmin({collapseWhitespace: true}))
    .pipe(gulp.dest('.'));
});
gulp.task('build-pdf', function () {
  return Promise
    .resolve(theme.render(resume, {less: {append: 'blockquote { display: none; }'}}))
    .then(function (html) {
      return Promise.promisifyAll(pdf.create(html, {
        filename: 'resume.pdf',
        border: {top: '.75in', right: '.5in', bottom: '.75in', left: '.5in'}
      })).toFileAsync();
    });
});
gulp.task('build', ['build-html', 'build-pdf']);

gulp.task('before-watch', function () { watching = true; });
gulp.task('watch', ['before-watch', 'build'], function () {
  b.on('update', bundle);
  gulp.watch('**/*.less', ['build-css']);
});

gulp.task('default', ['build']);
