
import sounds from './sounds';

var sc = require('supercolliderjs');
var rx = require('rx');
var path = require('path');
var _ = require('lodash');

const synth = sc.dryads.synth;
const group = sc.dryads.group;
const compileSynthDef = sc.dryads.compileSynthDef;

export default class Sound {

  constructor(stream, params) {
    if (stream) {
      this.setSubject(stream, params);
    }
    this.dB = -25;
    this.bpm = 60;
    this.soundSet = _.shuffle(_.keys(sounds))[0];
    this.initializeParams();
  }

  static synthDefs() {
    var synthDefs = [];
    for (let name in sounds) {
      let ss = sounds[name];
      synthDefs.push(compileSynthDef(ss.defName, ss.source));
    }
    return synthDefs;
  }

  output() {
    this.soundStream = new rx.Subject();

    return group([
      sc.dryads.stream(this.soundStream)
    ]);
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
    var sd = sounds[this.soundSet];
    event.units.forEach((unit, i) => {
      var output = unit.output;
      if ((output >= 0.02) && (output <= 0.98)) {
        // var level = 1 - Math.abs(output);
        var args = sd.args(i, output, 1 / (this.bpm / 60));
        args = _.assign(args,
          this.params,
          {
            amp: sc.map.dbToAmp(this.dB)
          });
        var sy = synth(sd.defName, args);
        sy.i = i;
        synths.push(sy);
      }
    });
    // switch timing mode
    // even with gaps: loopMs / numUnits * i
    // strum: 100ms
    // polyrhythm no gaps: loopMs / playing-num-units * si
    var beat = this.bpm / 60 * 1000;
    var dur = beat / (synths.length || 1);
    _.each(synths, (sy, si) => {
      setTimeout(() => {
        this.soundStream.onNext(sy);
      }, si * dur);
      // console.log('dur', dur, 'si', si, 'delay', si * dur);
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
    var sound = sounds[this.soundSet];
    _.each(sound.params || {}, (spec, name) => {
      specs[name] = spec;
    });
    return specs;
  }
}
