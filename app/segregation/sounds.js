var sc = require('supercolliderjs');

function lin(minval, maxval, val) {
  return sc.map.linToLin(0, 1, minval, maxval, val);
}

const synth = [
  {
    defName: 'blip',
    source:
      `{ arg out=0, freq=440, numharm=200, pan=0, timeScale=1.0, amp=1.0;
          Out.ar(out,
            Pan2.ar(
              Blip.ar(freq, numharm, amp) *
                EnvGen.kr(Env.linen(0.01, 0.2, 0.01),
                  timeScale: timeScale,
                  doneAction: 2),
              pan
            )
          );
        }
      `,
    // data mapped to synth args
    args: (cell, x, y) => {
      return {
        freq: sc.map.midiToFreq(cell.coords.col * 2 + 30),
        numharm: lin(0, 50, y),
        pan: lin(-1, 1, x)
      };
    },
    // extra args that are modulateable with sliders
    params: {
      timeScale: {
        default: 1,
        minval: 0.1,
        maxval: 4.0
      }
    }
  },

  {
    defName: 'blop',
    source:
      `{ arg out=0, freq=440, ffreq=800, rq=0.3, pan=0, timeScale=1.0, amp=1.0;
        var fenv = EnvGen.kr(Env.linen(0.05, 0.05, 0.1));
        Out.ar(out,
          Pan2.ar(
            RLPF.ar(Saw.ar(freq, amp), ffreq * fenv, rq * fenv + 0.1) *
              EnvGen.kr(Env.linen(0.01, 0.1, 0.01),
                timeScale: timeScale,
                doneAction: 2),
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
      },
      timeScale: {
        default: 1,
        minval: 0.1,
        maxval: 4.0
      }
    }
  }
];

const ripNoise = [
  {
    defName: 'hiss',
    source: `
    { arg out=0, ffreq=400.0, bwr=1.0,
        decay=0.04, noise=0.03, pan=0, timeScale=1.0, amp=1.0;

      Out.ar(
        out,
        Resonz.ar(
          PinkNoise.ar(2),
          ffreq,
          bwr,
          4).distort *
            EnvGen.kr(Env.linen(0.01, 0.1, 0.01),
              levelScale: amp,
              timeScale: timeScale,
              doneAction: 2),
      );
    }`,
    args: (cell, x, y) => {
      return {
        ffreq: lin(20, 3000, x),
        bwr: lin(0.05, 1.0, x),
        pan: lin(-1, 1, x)
      };
    },
    params: {
      timeScale: {
        default: 1,
        minval: 0.1,
        maxval: 4.0
      }
    }
  },

  {
    defName: 'droner',
    source:
      `{ arg out=0, freq=440, feedback=0.0,
          rq=0.3, pan=0, timeScale=1.0, amp=1.0;

        Out.ar(out,
          Pan2.ar(
            SinOscFB.ar(freq, feedback) *
              EnvGen.kr(Env.linen(0.01, 0.05, 0.01),
                timeScale: timeScale,
                levelScale: amp * 0.6,
                doneAction: 2),
            pan
          )
        );
      }`,
    args: (cell, x, y) => {
      return {
        freq: sc.map.midiToFreq(cell.coords.row * 3 + 40),
        feedback: lin(0.0, 4.0, x),
        rq: lin(0.05, 1.0, x),
        pan: lin(-1, 1, x)
      };
    },
    params: {
      timeScale: {
        default: 1,
        minval: 0.1,
        maxval: 4.0
      }
    }
  }
];

export default {
  synth,
  ripNoise
};
