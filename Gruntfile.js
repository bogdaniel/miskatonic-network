"use strict";

module.exports = function (grunt) {
    grunt.initConfig({
        pkg: grunt.file.readJSON('package.json'),
        jshint: {
            options: {
                node: true,
                strict: true,
                browser: false,
                esnext: true,
                predef: ['-Promise', '-Set']
            },
            all: [
                '**/*.js',
                '!public/**/*',
                '!bower_components/**/*',
                '!node_modules/**/*'
            ]
        },
        uglify: {
            build: {
                files: {
                    'public/build/script.js': [
                        'resources/js/*.js'
                    ]
                }
            }
        },
        concat: {
            build: {
                files: {
                    'public/build/<%= pkg.name %>.min.js': [
                        'bower_components/jquery/dist/jquery.min.js',
                        'bower_components/bootstrap/dist/js/bootstrap.min.js',
                        'public/build/script.js'
                    ],
                    'public/build/<%= pkg.name %>.min.css': [
                        'bower_components/bootstrap/dist/css/bootstrap.min.css',
                        'bower_components/bootstrap/dist/css/bootstrap-theme.min.css',
                        'resources/css/*.css'
                    ]
                }
            }
        },
        watch: {
            scripts: {
                files: ['resources/**/*'],
                tasks: ['asset']
            }
        }
    });

    grunt.loadNpmTasks('grunt-contrib-jshint');
    grunt.loadNpmTasks('grunt-contrib-uglify');
    grunt.loadNpmTasks('grunt-contrib-concat');
    grunt.loadNpmTasks('grunt-contrib-watch');

    grunt.registerTask('asset', ['uglify', 'concat']);
    grunt.registerTask('default', ['jshint', 'uglify', 'concat']);
};