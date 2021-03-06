var gulp = require('gulp');
var sass = require('gulp-sass');
var watch = require('gulp-watch');
var browserSync = require('browser-sync').create();
var notify = require("gulp-notify");
var lazypipe = require("lazypipe");
var runSequence = require('run-sequence');
var nunjucksRender = require('gulp-nunjucks-render');
var faker = require('faker');
var clean = require('gulp-clean');
var cssnano = require('cssnano');
var sourcemaps = require('gulp-sourcemaps');
var argv = require('yargs').argv;
var postcss = require('gulp-postcss');
var autoprefixer = require('autoprefixer');
var doiuse = require('doiuse');
const gutil = require("gulp-util");
const stylelint = require("stylelint");
var postcssReporter = require('postcss-reporter');
var syntax_scss = require('postcss-scss');
var uncss = require('uncss').postcssPlugin;
var glob = require("glob");


/* to enable prod mode type 'gulp SOME-TASK --production' */
var isProd = argv.production;

/*
 * See docs https://github.com/ai/browserslist
 * See exact browser list at http://browserl.ist
 */
const SUPPORTED_BROWSERS = '> 1%, last 2 versions, ie >= 8';

var postcssReporterOptions = {clearAllMessages: true};
var postcssPlugins = [
    autoprefixer({browsers: SUPPORTED_BROWSERS}),
    doiuse({
        browsers: SUPPORTED_BROWSERS,
        ignore: ['flexbox'], // an optional array of features to ignore
        onFeatureUsage: () => {
        } // do nothing. postCSS reported will output all info
    }),
    postcssReporter(postcssReporterOptions),
];

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

var TEMPLATES_DIR = 'src';
var nunjucksOptions = {
    path: TEMPLATES_DIR,
    data: {
        f: faker,
        randint: (min, max) => {
            var range = max - min;
            var rand = Math.floor(Math.random() * (range + 1));
            return min + rand;
        }
    }
};
nunjucksRender.nunjucks.installJinjaCompat();

/* reusable pipe. note that we all pipes are functions that return, e.g. gulp.dest() */
var processNunjucks = lazypipe()
    .pipe(() => nunjucksRender(nunjucksOptions))
    .pipe(() => gulp.dest('dist'))
    .pipe(() => browserSync.reload({stream: true}));

gulp.task('clean-dist-dir', function () {
    return gulp.src('dist', {read: false})
        .pipe(clean());
});

gulp.task('build-css', function () {
    var postcssPlugins_ = postcssPlugins;
    if (isProd) {
        postcssPlugins_.push(cssnano());
        var htmlFiles = glob.sync('./dist/**/*.html');
        postcssPlugins_.push(uncss({
            html: htmlFiles
        }));
    }

    gulp.src('src/scss/main.scss')
        .pipe(postcss([stylelint(), postcssReporter(postcssReporterOptions)], {syntax: syntax_scss}))
        .pipe(sourcemaps.init())
        .pipe(sass().on('error', notifyError))
        .pipe(postcss(postcssPlugins_).on('error', gutil.log))
        .pipe(sourcemaps.write('.'))
        .pipe(gulp.dest('dist/css'))
        .pipe(browserSync.stream())
});

gulp.task('build-html', function () {
    // ignore partials like _*.njk
    return gulp.src([TEMPLATES_DIR + '/**/*.njk', '!' + TEMPLATES_DIR + '/**/_*.njk'])
        .pipe(processNunjucks().on('error', notifyError))
});


gulp.task('browsersync', function () {
    /* see https://webref.ru/dev/automate-with-gulp/live-reloading */
    browserSync.init({
        server: "./dist",
    });
});

gulp.task('build', function (callback) {
    // for prod, we require to build HTML before CSS because of unCSS plugin
    if (isProd) {
        runSequence('clean-dist-dir', 'build-html', 'build-css', callback)
    } else {
        runSequence('clean-dist-dir', ['build-css', 'build-html'], callback)
    }
});

gulp.task('watch', ['build'], function () {
    gulp.watch('src/scss/*.scss', ['build-css']);
    // watch template files (excluding partials _*.njk)
    watch([TEMPLATES_DIR + '/**/*.njk', '!' + TEMPLATES_DIR + '/**/_*.njk'], function (file) {
        gulp.src(TEMPLATES_DIR + '/' + file.relative)
            .pipe(processNunjucks().on('error', notifyError))
            .pipe(notify(notifyFileProcessedOptions))
    });
    // when some partial is changed, recompile ALL HTML
    gulp.watch(TEMPLATES_DIR + '/**/_*.njk', ['build-html']);
});

gulp.task('serve', function () {
    runSequence(['browsersync', 'watch'])
});
gulp.task('default', ['serve']);
