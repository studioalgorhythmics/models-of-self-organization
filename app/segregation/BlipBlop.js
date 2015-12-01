
import sounds from './sounds';

var sc = require('supercolliderjs');
var rx = require('rx');
var _ = require('lodash');

const synth = sc.dryads.synth;
const group = sc.dryads.group;
const compileSynthDef = sc.dryads.compileSynthDef;

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
    this.soundSet = 'synth';
    this.initializeParams();
  }

  play() {
    this.soundStream = new rx.Subject();

    var synthDefs = [];
    for (let name in sounds) {
      sounds[name].forEach((ss) => {
        synthDefs.push(compileSynthDef(ss.defName, ss.source));
      });
    }

    this.sound = group([
      sc.dryads.interpreter(synthDefs),
      sc.dryads.stream(this.soundStream)
    ]);
    this.sound();
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
