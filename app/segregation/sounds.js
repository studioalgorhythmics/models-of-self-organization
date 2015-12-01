var sc = require('supercolliderjs');

function lin(minval, maxval, val) {
  return sc.map.linToLin(0, 1, minval, maxval, val);
}

const synth = [
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
    args: (cell, x, y) => {
      return {
        freq: sc.map.midiToFreq(cell.coords.col * 2 + 30),
        numharm: lin(0, 50, y),
        pan: lin(-1, 1, x)
      };
    },
    params: {}
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
    args: (cell, x, y) => {
      return {
        freq: sc.map.midiToFreq(cell.coords.col * 2 + 30),
        ffreq: sc.map.midiToFreq(cell.coords.row * 3 + 30),
        rq: lin(0.05, 1.0, x),
        pan: lin(-1, 1, x)
      };
    },
    params: {
      rq: {
        default: 0.3,
        minval: 0.05,
        maxval: 1.0
      }
    }
  }
];

const wire = [
  {
    defName: 'rip',
    source: `
    { arg out=0, ffreq=400.0, bwr=1.0, decay=0.04, noise=0.03, pan=0, amp=1.0;

      Out.ar(
        out,
        Resonz.ar(
          WhiteNoise.ar(Decay2.ar(Impulse.ar(0), 0.002, decay, 70)),
          ffreq,
          bwr,
          4).distort *
        EnvGen.kr(Env.linen(0.01, 0.2, 0.01), doneAction: 2)
      );
    }`,
    args: (cell, x, y) => {
      return {
        ffreq: lin(20, 3000, x),
        bwr: lin(0.05, 1.0, x),
        pan: lin(-1, 1, x)
      };
    }
  },

  {
    defName: 'hiss',
    source:
      `{ arg out=0, freq=440, feedback=0.0, rq=0.3, pan=0, amp=1.0;
        var fenv = EnvGen.kr(Env.linen(0.05, 0.05, 0.1));
        Out.ar(out,
          Pan2.ar(
            SinOscFB.ar(freq, feedback, amp) *
              EnvGen.kr(Env.linen(0.01, 0.05, 0.01), doneAction: 2),
            pan
          )
        );
      }`,
    args: (cell, x, y) => {
      return {
        freq: sc.map.midiToFreq(x * 3 + 10),
        feedback: lin(0.0, 4.0, x),
        rq: lin(0.05, 1.0, x),
        pan: lin(-1, 1, x)
      };
    }
  }
];

export default {
  synth: synth,
  wire: wire
};
