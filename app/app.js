// Here is the starting point for code of your own application.
// All stuff below is just to show you how it works. You can delete all of it.

// Modules which you authored in this project are intended to be
// imported through new ES6 syntax.
import main from './segregation/app';

// Node.js modules and those from npm
// are required the same way as always.
// var os = require('os');
// var app = require('remote').require('app');
// var jetpack = require('fs-jetpack').cwd(app.getAppPath());
// Holy crap! This is browser window with HTML and stuff, but I can read
// here files like it is node.js! Welcome to Electron world :)
// console.log(jetpack.read('package.json', 'json'));

// window.env contains data from config/env_XXX.json file.
// var envName = window.env.name;

document.addEventListener('DOMContentLoaded', function() {

  main();

});
