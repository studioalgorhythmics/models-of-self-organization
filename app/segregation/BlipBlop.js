
var sc = require('supercolliderjs');
var rx = require('rx');
const synth = sc.dryads.synth;
const group = sc.dryads.group;
const compileSynthDef = sc.dryads.compileSynthDef;

const blip = compileSynthDef('blip', `
  { arg out=0, freq=440, numharm=200, amp=1.0;
    Out.ar(out,
      Blip.ar(freq, amp) * EnvGen.kr(Env.perc(0.1, 0.3))
    );
  }
`);

const blop = compileSynthDef('blop', `
  { arg out=0, freq=440, width=0.5, amp=1.0;
    Out.ar(out,
      Pulse.ar(freq, width, amp) * EnvGen.kr(Env.perc(0.1, 0.3))
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
    this.subscription = stream.subscribe((next) => this.update(next));
    this.modelParams = params;
    this.sideLength = Math.sqrt(params.size);
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
      // push a group into the synthStream
      // to be spawned
      this.soundStream.onNext(group(synths));
    }
  }

  blip(cell) {
    return synth('blip', {
      freq: sc.map.midiToFreq(cell.coords.col * 2 + 30),
      numharm: sc.map.linToLin(0, this.sideLength, 0, 20, cell.coords.row),
      amp: sc.map.dbToAmp(-10)
    });
  }

  blop(cell) {
    return synth('blop', {
      freq: sc.map.midiToFreq(cell.coords.col * 2 + 30),
      width: cell.coords.row / this.sideLength,
      amp: sc.map.dbToAmp(-10)
    });
  }
}
