
var sc = require('supercolliderjs');
var rx = require('rx');
const synth = sc.dryads.synth;
const group = sc.dryads.group;
const compileSynthDef = sc.dryads.compileSynthDef;

const blip = compileSynthDef('blip', `
  { arg out=0, freq=440, numharm=200, pan=0, amp=1.0;
    Out.ar(out,
      Pan2.ar(
        Blip.ar(freq, numharm, amp) *
          EnvGen.kr(Env.linen(0.01, 0.2, 0.01), doneAction: 2),
        pan
      )
    );
  }
`);

const blop = compileSynthDef('blop', `
  { arg out=0, freq=440, ffreq=800, rq=0.3, pan=0, amp=1.0;
    var fenv = EnvGen.kr(Env.linen(0.05, 0.05, 0.1));
    Out.ar(out,
      Pan2.ar(
        RLPF.ar(Saw.ar(freq, amp), ffreq * fenv, rq * fenv + 0.1) *
          EnvGen.kr(Env.linen(0.01, 0.1, 0.01), doneAction: 2),
        pan
      )
    );
  }
`);

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
  }

  play() {
    this.soundStream = new rx.Subject();
    this.sound = group([
      sc.dryads.interpreter([
        blip,
        blop,
        // sounds are spawned when synths are pushed to this.soundStream
        sc.dryads.stream(this.soundStream)
      ])
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
      if (cell.group === 'group1') {
        synths.push(this.blip(cell));
      } else if (cell.group === 'group2') {
        synths.push(this.blop(cell));
      }
    });
    if (synths.length) {
      // push a group into the synthStream to be spawned
      // the group is never freeing
      // this.soundStream.onNext(group(synths));
      synths.forEach((synth) => {
        this.soundStream.onNext(synth);
      });
    }
  }

  blip(cell) {
    return synth('blip', {
      freq: sc.map.midiToFreq(cell.coords.col * 2 + 30),
      numharm: sc.map.linToLin(0, this.sideLength, 0, 50, cell.coords.row),
      pan: sc.map.linToLin(0, this.sideLength, -1, 1, cell.coords.col),
      amp: sc.map.dbToAmp(this.dB)
    });
  }

  blop(cell) {
    return synth('blop', {
      freq: sc.map.midiToFreq(cell.coords.col * 2 + 30),
      ffreq: sc.map.midiToFreq(cell.coords.row * 3 + 30),
      rq: sc.map.linToLin(0, this.sideLength, 0.05, 1.0, cell.coords.row),
      pan: sc.map.linToLin(0, this.sideLength, -1, 1, cell.coords.col),
      amp: sc.map.dbToAmp(this.dB)
    });
  }
}
