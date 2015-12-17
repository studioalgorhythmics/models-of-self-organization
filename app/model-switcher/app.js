
import segregation from '../segregation/app';
import homeostat from '../homeostat/app';

const models = {
  segregation,
  homeostat
};

var sc = require('supercolliderjs');
var rx = require('rx');
var path = require('path');
var _ = require('lodash');

const synth = sc.dryads.synth;
const group = sc.dryads.group;
const server = sc.dryads.server;
const compileSynthDef = sc.dryads.compileSynthDef;

/**
 * env is loaded from config/env_(development|production|test).json
 * You can set options to pass in supercollider options,
 * specifically a path to a working sclang which will then be used
 * to compile synthDefs. If not set (the default) then the app will
 * load pre-compiled synthDefs from ./synthdefs
 */
var env = window.env || {};

const options = _.defaults(env.options || {}, {
  // This copy was still not portable due to Qt dylib errors:
  // sclang: path.join(__dirname, 'vendor/supercollider/osx/sclang'),
  scsynth: path.join(__dirname, 'vendor/supercollider/osx/scsynth'),
  echo: true,
  debug: false,
  includePaths: [],
  'sclang_conf': null
});

const synthDefsDir = path.join(__dirname, 'synthdefs');

/**
 * Top level app that enables switching between different models
 * and playing their sound through a shared supercollider output chain.
 * Also compiles and loads any SynthDefs required by the models.
 */
export default class ModelSwitcher {

  constructor(el) {
    this.el = el;
    this.dB = -25;
  }

  /**
   * Could show an index page here with thumbnails.
   * under construction. Use the menu for now.
   */
  showIndex() {
    // var vars = {
    //   models: models
    // };
    // var html = jade.render(jetpack.read(tpl), vars);
    // console.log(html);
    // this.el.innerHTML = html;
  }

  windowDidResize() {
    if (this.app) {
      this.app.windowDidResize();
    }
  }

  /**
   * Switch to a model and display it.
   */
  selectModel(name) {
    if (this.currentModel === name) {
      return;
    }
    if (this.app) {
      this.app.unload();
    }
    const App = models[name];
    if (App) {
      this.app = new App(this.el);
      this.spawnSound(this.app.sound.output());
    }
  }

  /**
   * A list of `compileSynthDefs` dryads for each SynthDef
   * that each model uses.
   * This is used only when compiling synthdefs.
   */
  synthDefs() {
    return segregation.synthDefs().concat(homeostat.synthDefs());
  }

  /**
   * Boot supercollider with a top level group.
   * Compiles SynthDefs if sclang is available (in development)
   * and writes those to disk.
   * If no sclang (eg. a production release) then pre-compiled synthdefs are loaded.
   */
  play() {
    // each app produces a .sound object
    // which I push to this stream
    // which spawns it in supercollider
    this.soundStream = new rx.Subject();

    // have to wait until after the others are done
    // and there is no async tool for sequencing tasks like that yet.
    const writeDefs = (context) => {
      setTimeout(() => {
        context.lang.interpret(`
        SynthDescLib.default.synthDescs
          .keysValuesDo({ arg defName, synthDesc;
            synthDesc.def.writeDefFile("` + synthDefsDir + `");
          });`);
      }, 5000);
    };

    const master = compileSynthDef('master', `
      { arg out=0;
        var in, lim;
        var threshold=0.5, slope=0.5, clampTime=0.1, relaxTime=0.3;
        in = In.ar(out, 2);
        lim = Compander.ar(in, in.first.max(0.0001), threshold, 1.0 ,slope, clampTime, relaxTime);
        lim = Limiter.ar(in, 0.99);
        ReplaceOut.ar(out, lim);
      }
    `);

    const loadDefs = (context) => {
      return context.server.callAndResponse(sc.msg.defLoadDir(synthDefsDir));
    };

    var stack = [loadDefs];
    if (options.sclang) {
      var interpretTogether = this.synthDefs();
      interpretTogether.push(master);
      interpretTogether.push(writeDefs);
      stack.push(sc.dryads.interpreter(interpretTogether, options));
    }

    stack.push(sc.dryads.stream(this.soundStream));
    // with this version of the dryads it isn't possible
    // to wait for /d_loadDir before spawning.
    // stack.push(group([synth('master', {out: 0})]));
    // So just spawn it 2secs later. Will fix when new supercollider.js is out
    stack.push((context) => {
      return new Promise((resolve) => {
        setTimeout(() => {
          synth('master', {out: 0})(context).then(resolve);
        }, 2000);
      });
    });

    this.master = server([
      group(stack)
    ], options);

    return this.master();
  }

  start() {
    if (this.app) {
      this.app.start();
    }
  }

  stop() {
    if (this.app) {
      this.app.stop();
    }
  }

  /**
   * Spawn a model's top level output dryad.
   */
  spawnSound(dryad) {
    // need to store the previous and stop it.
    // right now every time you switch its leaving an empty group on the server.
    // not a huge problem yet.
    this.soundStream.onNext(dryad);
  }
}
