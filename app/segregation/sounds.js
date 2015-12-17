var sc = require('supercolliderjs');

function lin(minval, maxval, val) {
  return sc.map.linToLin(0, 1, minval, maxval, val);
}

const synth = [
  {
    defName: 'blip',
    source:
      `{ arg out=0, freq=440, numharm=200, pan=0, timeScale=1.0, smooth=0.01, amp=1.0;
          Out.ar(out,
            Pan2.ar(
              Blip.ar(freq, numharm, amp) *
                EnvGen.kr(Env.linen(smooth, 0.1, smooth),
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
      },
      smooth: {
        default: 0.1,
        minval: 0.01,
        maxval: 1.0
      }
    }
  },

  {
    defName: 'blop',
    source:
      `{ arg out=0, freq=440, ffreq=800, rq=0.3, pan=0, timeScale=1.0, smooth=0.01, amp=1.0;
        var fenv = EnvGen.kr(Env.linen(0.05, 0.05, 0.1));
        Out.ar(out,
          Pan2.ar(
            RLPF.ar(Saw.ar(freq, amp), ffreq * fenv, rq * fenv + 0.1) *
              EnvGen.kr(Env.linen(smooth, 0.1, smooth),
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
        default: 0.9,
        minval: 0.05,
        maxval: 1.0
      },
      timeScale: {
        default: 1,
        minval: 0.1,
        maxval: 4.0
      },
      smooth: {
        default: 0.1,
        minval: 0.01,
        maxval: 1.0
      }
    }
  }
];

const ripNoise = [
  {
    defName: 'hiss',
    source: `
    { arg out=0, ffreq=400.0, bwr=1.0,
        decay=0.04, noise=0.03, pan=0, timeScale=1.0, smooth=0.01, amp=1.0;

      Out.ar(
        out,
        Resonz.ar(
          PinkNoise.ar(1),
          ffreq,
          bwr,
          4).distort *
            EnvGen.kr(Env.linen(smooth, 0.1, smooth),
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
      },
      smooth: {
        default: 0.1,
        minval: 0.01,
        maxval: 1.0
      }
    }
  },

  {
    defName: 'droner',
    source:
      `{ arg out=0, freq=440, feedback=0.0,
          rq=0.3, pan=0, timeScale=1.0, smooth=0.01, amp=1.0;

        Out.ar(out,
          Pan2.ar(
            SinOscFB.ar(freq, feedback) *
              EnvGen.kr(Env.linen(smooth, 0.05, smooth),
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
      },
      smooth: {
        default: 0.1,
        minval: 0.01,
        maxval: 1.0
      }
    }
  }
];

const pp = `
  { arg out=0, freq=440, numharm=200, pan=0, timeScale=1.0, smooth=0.01, amp=1.0;
    Out.ar(out,
      Pan2.ar(
        Blip.ar(
          freq + (EnvGen.kr(Env.perc(0.1, smooth * 10)) * 40),
          numharm,
          amp * 1.5) *
            EnvGen.kr(Env.perc(0.01, smooth),
              timeScale: timeScale,
              doneAction: 2),
        pan
      )
    );
  }`;

const pingPong = [
  {
    defName: 'ping',
    source: pp,
    // data mapped to synth args
    args: (cell, x, y) => {
      return {
        freq: sc.map.midiToFreq(cell.coords.col + 30),
        numharm: lin(2, 1000, y),
        pan: -1
      };
    },
    // extra args that are modulateable with sliders
    params: {
      timeScale: {
        default: 1,
        minval: 0.1,
        maxval: 4.0
      },
      smooth: {
        default: 0.4,
        minval: 0.01,
        maxval: 1.0
      }
    }
  },

  {
    defName: 'pong',
    source: pp,
    args: (cell, x, y) => {
      return {
        freq: sc.map.midiToFreq(cell.coords.col + 30),
        numharm: lin(2, 1000, y),
        pan: 1
      };
    },
    params: {
      timeScale: {
        default: 1,
        minval: 0.1,
        maxval: 4.0
      },
      smooth: {
        default: 0.4,
        minval: 0.01,
        maxval: 1.0
      }
    }
  }
];

export default {
  synth,
  ripNoise,
  pingPong
};
