
import sounds from './sounds';

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
 * For each changed cell it plays a blip or a blop.
 * x -> freq
 * y -> secondary freq
 */
export default class BlipBlop {

  constructor(stream, params) {
    if (stream) {
      this.setSubject(stream, params);
    }
    this.dB = -25;
    this.soundSet = _.shuffle(_.keys(sounds))[0];
    this.initializeParams();
  }

  play() {
    this.soundStream = new rx.Subject();

    // have to wait until after the others are done
    // and there is no async tool for sequencing tasks like that yet.
    var writeDefs = (context) => {
      setTimeout(() => {
        context.lang.interpret(`
        SynthDescLib.default.synthDescs
          .keysValuesDo({ arg defName, synthDesc;
            synthDesc.def.writeDefFile("` + synthDefsDir + `");
          });`);
      }, 5000);
    };

    var stack = [];
    if (options.sclang) {
      var synthDefs = [];
      for (let name in sounds) {
        sounds[name].forEach((ss) => {
          synthDefs.push(compileSynthDef(ss.defName, ss.source));
        });
      }
      synthDefs.push(writeDefs);
      stack.push(sc.dryads.interpreter(synthDefs, options));
    } else {
      stack.push((context) => {
        return context.server.callAndResponse(sc.msg.defLoadDir(synthDefsDir));
      });
    }

    // stream() spawns a synth everytime and event is pushed to this.soundStream
    stack.push(sc.dryads.stream(this.soundStream));

    this.sound = server([
      group(stack)
    ], options);

    return this.sound();
  }

  setSubject(stream, params) {
    if (this.subscription) {
      this.subscription.dispose();
    }
    if (stream) {
      this.subscription = stream.subscribe((next) => this.update(next));
    }
    if (params) {
      this.modelParams = params;
      this.sideLength = params.size;
    }
  }

  update(event) {
    // console.log('sound', event);
    var synths = [];
    event.changedCells.forEach((i) => {
      var cell = event.cells[i];
      var ss = sounds[this.soundSet][cell.group === 'group1' ? 0 : 1];
      var x = sc.map.linToLin(0, this.sideLength, 0.0, 1.0, cell.coords.col);
      var y = sc.map.linToLin(0, this.sideLength, 0.0, 1.0, cell.coords.row);
      var args = ss.args(cell, x, y);
      // params are set by dat.gui
      args = _.assign(args, this.params, {amp: sc.map.dbToAmp(this.dB)});
      var sy = synth(ss.defName, args);
      this.soundStream.onNext(sy);
    });
  }

  initializeParams() {
    this.params = _.mapValues(
      this.paramSpecs(),
      (spec, name) => spec.default);
  }

  soundSets() {
    return _.keys(sounds);
  }

  paramSpecs() {
    var specs = {};
    _.each(sounds[this.soundSet], (sound) => {
      _.each(sound.params || {}, (spec, name) => {
        specs[name] = spec;
      });
    });
    return specs;
  }
}
