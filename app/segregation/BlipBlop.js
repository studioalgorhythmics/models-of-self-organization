
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
    this.initSounds();
    this.soundSet = 'synth';
  }

  play() {
    this.soundStream = new rx.Subject();

    var synthDefs = [];
    for (let name in this.sounds) {
      this.sounds[name].forEach((ss) => {
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
      var ss = this.sounds[this.soundSet][cell.group === 'group1' ? 0 : 1];
      var sy = synth(ss.defName, ss.args(cell));
      this.soundStream.onNext(sy);
    });
  }

  initSounds() {
    this.sounds = {};

    this.sounds.synths = [
      {
        defName: 'blip',
        source:
          `{ arg out=0, freq=440, numharm=200, pan=0, amp=1.0;
              Out.ar(out,
                Pan2.ar(
                  Blip.ar(freq, numharm, amp) *
                    EnvGen.kr(Env.linen(0.01, 0.2, 0.01), doneAction: 2),
                  pan
                )
              );
            }
          `,
        args: (cell) => {
          return {
            freq: sc.map.midiToFreq(cell.coords.col * 2 + 30),
            numharm: sc.map.linToLin(
              0, this.sideLength,
              0, 50,
              cell.coords.row),
            pan: sc.map.linToLin(0, this.sideLength, -1, 1, cell.coords.col),
            amp: sc.map.dbToAmp(this.dB)
          };
        }
      },
      {
        defName: 'blop',
        source:
          `{ arg out=0, freq=440, ffreq=800, rq=0.3, pan=0, amp=1.0;
            var fenv = EnvGen.kr(Env.linen(0.05, 0.05, 0.1));
            Out.ar(out,
              Pan2.ar(
                RLPF.ar(Saw.ar(freq, amp), ffreq * fenv, rq * fenv + 0.1) *
                  EnvGen.kr(Env.linen(0.01, 0.1, 0.01), doneAction: 2),
                pan
              )
            );
          }`,
        args: (cell) => {
          return {
            freq: sc.map.midiToFreq(cell.coords.col * 2 + 30),
            ffreq: sc.map.midiToFreq(cell.coords.row * 3 + 30),
            rq: sc.map.linToLin(0, this.sideLength, 0.05, 1.0, cell.coords.row),
            pan: sc.map.linToLin(0, this.sideLength, -1, 1, cell.coords.col),
            amp: sc.map.dbToAmp(this.dB)
          };
        }
      }
    ];
  }

  soundSets() {
    return _.keys(this.sounds);
  }
}
