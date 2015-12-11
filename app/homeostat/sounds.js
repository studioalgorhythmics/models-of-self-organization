var sc = require('supercolliderjs');

function lin(minval, maxval, val) {
  return sc.map.linToLin(0, 1, minval, maxval, val);
}

const pulse = {
  defName: 'pulse',
  source:
    `{ arg out=0, freq=440, width=0.5,
        ffreq=440, rq=1, timeScale=1.0, levelScale=1.0, dur=1.0, amp=1.0;
        var p = Pulse.ar(freq, width, amp) *
          EnvGen.kr(Env.perc(0.01, 1),
            timeScale: timeScale * dur,
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
      levelScale: (1 - Math.abs(output)) * 1.1,
      dur: dur
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

const pulse2 = {
  defName: 'pulse2',
  source:
    `{ arg out=0, freq=440, width=0.5,
        ffreq=440, rq=1, timeScale=1.0, levelScale=1.0, dur=1.0, amp=1.0;
        var p = Pulse.ar([freq, freq + 2], width, amp) *
          EnvGen.kr(Env.linen(0.01, 1, 0.05),
            timeScale: timeScale * dur,
            levelScale: levelScale,
            doneAction: 2);
        var f = BPF.ar(p, ffreq, rq);
        Out.ar(out, f);
      }
    `,
  // data mapped to synth args
  args: (index, output, dur) => {
    var abs = Math.abs(output);
    var inv = 1 - abs;
    // 0..1 sine wave with peaks at -0.5 and 0.5
    var wav = 0.5 * (1 - Math.cos(2 * output * Math.PI));
    return {
      freq: sc.map.midiToFreq(index * 2 + 50),
      ffreq: Math.min(sc.map.midiToFreq(index * 3 + 64), 12000),
      rq: sc.map.linToLin(0, 1, 0.1, 2.0, wav),
      width: inv,
      levelScale: inv * 1.1 * wav,
      dur: dur
    };
  },
  // extra args that are modulateable with sliders
  params: {
    timeScale: {
      default: 1,
      minval: 0.1,
      maxval: 4.0
    }
    // ffreq: {
    //   default: 1000,
    //   minval: 400,
    //   maxval: 10000
    // },
    // rq: {
    //   default: 1.0,
    //   minval: 0.05,
    //   maxval: 2.0
    // }
  }
};

export default {
  pulse,
  pulse2
};
