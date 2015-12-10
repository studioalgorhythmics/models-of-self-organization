
import sounds from './sounds';

var sc = require('supercolliderjs');
var rx = require('rx');
var path = require('path');
var _ = require('lodash');

const synth = sc.dryads.synth;
const group = sc.dryads.group;
const server = sc.dryads.server;
const compileSynthDef = sc.dryads.compileSynthDef;

const options = {
  // dirname is returning as though it were top of project
  // I don't want to go into build
  // sclang: path.join(__dirname, 'vendor/supercollider/osx/sclang'),
  scsynth: path.join(__dirname, 'vendor/supercollider/osx/scsynth'),
  echo: true,
  debug: true,
  includePaths: [],
  'sclang_conf': null
};

export default class Sound {

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

    var synthDefs = [];
    for (let name in sounds) {
      let ss = sounds[name];
      synthDefs.push(compileSynthDef(ss.defName, ss.source));
    }

    this.sound = server([
      group([
        sc.dryads.interpreter(synthDefs, options),
        sc.dryads.stream(this.soundStream)
      ]),
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
    var si = 0;
    var sd = sounds[this.soundSet];
    event.units.forEach((unit, i) => {
      var output = unit.output;
      if ((output >= 0.05) && (output <= 0.95)) {
        // var level = 1 - Math.abs(output);
        var args = sd.args(i, output);
        args = _.assign(args,
          this.params,
          {amp: sc.map.dbToAmp(this.dB)});
        var sy = synth(sd.defName, args);
        setTimeout(() => {
          this.soundStream.onNext(sy);
        }, si * 100);
        si += 1;
      }
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
