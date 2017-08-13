var gulp = require('gulp');
var sass = require('gulp-sass');
var watch = require('gulp-watch');
var path = require('path');
var browserSync = require('browser-sync').create();
const shell = require('gulp-shell');
var notify = require("gulp-notify");
var lazypipe = require("lazypipe");
var runSequence = require('run-sequence');
var nunjucks = require('./gulp-nunjucks');

var notifyFileProcessedOptions = {
    sound: false,
    message: "<%= file.relative %>",
    title: "File processed"
};

var notifyError = notify.onError({
    sound: true,
    message: "<%= error.message %>",
    title: "Compile error"
});

var TEMPLATES_DIR = 'src/templates';

/* reusable pipe. note that we all pipes are functions that return, e.g. gulp.dest() */
var processNunjucks = lazypipe()
    .pipe(() => {return nunjucks(TEMPLATES_DIR) })
    .pipe(() => {return gulp.dest('dist/html') }) // or .pipe(gulp.dest, 'dist/html')
    .pipe(() => {return browserSync.reload({stream: true})});

gulp.task('build-css', function(){
    gulp.src('src/scss/main.scss')
        .pipe(sass().on('error', notifyError))
        .pipe(gulp.dest('dist/css'))
        .pipe(notify(notifyFileProcessedOptions))
        .pipe(browserSync.stream({match: '**/*.css'}))
});

gulp.task('build-html', function() {
    return gulp.src(TEMPLATES_DIR + '/**/*.njk')
        .pipe(processNunjucks().on('error', notifyError))
});

gulp.task('browsersync', function() {
    /* see https://webref.ru/dev/automate-with-gulp/live-reloading */
    browserSync.init({
      server: "./",
      open: false,
    });
    gulp.src('**/*.css').pipe(browserSync.reload({stream: true}));

    gulp.watch('src/scss/*.scss', ['build-css']);
    watch(TEMPLATES_DIR + '/**/*.njk', function (file) {
        gulp.src(TEMPLATES_DIR + '/' + file.relative)
            .pipe(processNunjucks().on('error', notifyError))
            .pipe(notify(notifyFileProcessedOptions))
    });
});

gulp.task('serve', runSequence('browsersync', ['build-css', 'build-html']));
gulp.task('default', [ 'serve' ]);
