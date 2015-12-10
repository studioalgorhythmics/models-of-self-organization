var sc = require('supercolliderjs');

function lin(minval, maxval, val) {
  return sc.map.linToLin(0, 1, minval, maxval, val);
}

const pulse = {
  defName: 'pulse',
  source:
    `{ arg out=0, freq=440, width=0.5,
        ffreq=440, rq=1, timeScale=1.0, levelScale=1.0, amp=1.0;
        var p = Pulse.ar(freq, width, amp) *
          EnvGen.kr(Env.perc(0.01, 0.2),
            timeScale: timeScale,
            levelScale: levelScale,
            doneAction: 2);
        var f = BPF.ar(p, ffreq, rq);
        Out.ar(out, f);
      }
    `,
  // data mapped to synth args
  args: (index, output, dur) => {
    return {
      freq: sc.map.midiToFreq(index * 2 + 50),
      ffreq: Math.min(sc.map.midiToFreq(index * 3 + 64), 12000),
      width: 1 - Math.abs(output),
      levelScale: (1 - Math.abs(output)) * 1.1
    };
  },
  // extra args that are modulateable with sliders
  params: {
    timeScale: {
      default: 1,
      minval: 0.1,
      maxval: 4.0
    },
    // ffreq: {
    //   default: 1000,
    //   minval: 400,
    //   maxval: 10000
    // },
    rq: {
      default: 1.0,
      minval: 0.05,
      maxval: 2.0
    }
  }
};

export default {
  pulse
};
