
// local ES6 classes use import
import Model from  './model';
import View from  './view';
import Sound from './sound';
import {minSide, windowSize} from '../utils';

// external npm packages use require
var d3 = require('d3');
var rx = require('rx');
var _ = require('lodash');

const controlsWidth = 250;
const margin = 50;

/**
 * Application class that connects the model, view, sound and controls together.
 */
export default class HomeostatApp {

  constructor(el) {
    this.speed = 250;
    this.dB = -10;

    this.numUnits = 4;
    this.viscosity = 0.4;

    this.render(el);
    var ws = windowSize();
    var width = Math.min(minSide(el), ws.width) - controlsWidth - margin;
    var height = Math.min(width, ws.height);
    var pxSize = Math.min(width, height);
    this.view = new View('#board svg', pxSize);

    this.sound = new Sound();
    this.buildModel();

    this.isPlaying = false;

    this.stepperFn = () => {
      this.isPlaying = true;
      this.model.next();
      this.stepper = setTimeout(this.stepperFn, this.ms());
    };

    this.controlsGui(el);
  }

  render(el) {
    var html = `
    <div class="content homeostat">
      <h1>Ross Ashby's Homeostat</h1>
      <div id="controls"></div>
      <div id="board"><svg></svg></div>
    </div>
    `;
    el.innerHTML = html;
  }

  controlsGui(el) {
    this.gui = new window.dat.GUI({autoPlace: false});
    this.gui.add(this, 'numUnits', 4, 40, 1).name('Number')
      .onChange((value) => {
        this.buildModel();
        if (this.isPlaying) {
          this.start();
        }
      });
    this.gui.add(this, 'viscosity', 0.0, 1.0, 0.01)
      .onChange((value) => {
        this.model.viscosity = value;
      });

    this.gui.add(this, 'speed', 10, 500)
      .onChange((value) => {
        this.sound.bpm = value;
      });
    this.sound.bpm = this.speed;

    this.gui.add(this, 'dB', -130.0, 0.0).onChange((value) => {
      this.sound.dB = value;
    });
    // select sonifier

    this.gui.add(this, 'start');
    this.gui.add(this, 'stop');
    this.gui.add(this, 'restart');

    this.addSoundSelector();
    this.addSoundParamControls();

    document.getElementById('controls').appendChild(this.gui.domElement);
  }

  addSoundSelector() {
    if (this.soundSelector) {
      this.gui.remove(this.soundSelector);
    }
    this.soundSelector = this.gui.add(this.sound,
      'soundSet',
      this.sound.soundSets());
    this.soundSelector.onChange(() => {
      this.sound.initializeParams();
      this.addSoundParamControls();
    });
  }

  addSoundParamControls() {
    if (this.soundParams) {
      this.soundParams.forEach((p) => this.gui.remove(p));
    }
    this.soundParams = [];
    _.each(this.sound.paramSpecs(), (spec, name) => {
      var c = this.gui.add(this.sound.params, name, spec.minval, spec.maxval);
      this.soundParams.push(c);
    });
  }

  buildModel() {
    this.model = new Model(this.numUnits, this.viscosity);

    var multicast = this.model.publish();
    this.view.setSubject(multicast, this.model.params());
    multicast.connect();
    this.model.next();
    this.sound.setSubject(multicast, this.model.params());
  }

  static synthDefs() {
    return Sound.synthDefs();
  }

  /**
   * Turn the sound engine on, waiting for events to spawn.
   */
  play() {
    return this.sound.play();
  }

  /*
   * Start stepping through the model
   */
  start() {
    if (this.stepper) {
      this.stop();
    }
    this.stepper = setTimeout(this.stepperFn, this.ms());
  }

  stop() {
    if (this.stepper) {
      clearTimeout(this.stepper);
      this.stepper = null;
    }
    this.isPlaying = false;
  }

  restart() {
    this.buildModel();
    this.start();
  }

  unload() {
    this.stop();
  }

  /**
   * Speed in milliseconds
   */
  ms() {
    return 60.0 / this.speed * 1000;
  }
}
