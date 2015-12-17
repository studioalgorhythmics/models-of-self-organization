
// local ES6 classes use import
import SegregationModel from  './model';
import SegregationView from  './view';
import BlipBlop from './BlipBlop';
import {minSide, windowSize, rnd} from '../utils';

// external npm packages use require
var d3 = require('d3');
var rx = require('rx');
var _ = require('lodash');

const controlsWidth = 300;
const margin = 15;

/**
 * Application class that connects the model, view, sound and controls together.
 */
export default class SegregationApp {

  constructor(el) {
    this.tolerance = 0.3;
    this.fill = 0.95;
    this.gridSize = 30;
    this.balance = 50.0;

    this.speed = 250;
    this.dB = -10;

    this.render(el);

    this.view = new SegregationView('#board svg', '#statistics svg',
      this.calcPxSize());

    this.sound = new BlipBlop();
    this.sound.dB = this.dB;
    this.buildModel();

    this.isPlaying = false;

    this.stepperFn = () => {
      this.isPlaying = true;
      this.model.next();
      this.stepper = setTimeout(this.stepperFn, this.ms());
    };

    this.controlsGui(el);
  }

  windowDidResize() {
    this.view.setPxSize(this.calcPxSize());
  }

  calcPxSize() {
    var ws = windowSize();
    var width = Math.min(minSide(this.el), ws.width) -
      controlsWidth - margin - margin;
    return width;
  }

  render(el) {
    var html = `
    <div class="segregation">
      <h1>Schelling's Spatial Segregation Model</h1>
      <h2>Verteilung Yak-Wurst-Esser / Pastinaken</h2>
      <div class="content">
        <div id="board"><svg></svg></div>
        <div id="lower">
          <div id="controls"></div>
          <div class="description">
            <div class="group1"><i class="icon-circle"></i> Yak-Wurst Esser</div>
            <div class="group2"><i class="icon-circle"></i> Pastinaken</div>
          </div>
          <div id="statistics">
            <div>
              <span id="percentAlikeChart"><svg></svg></span>
              <span id="percentAlikeReadout" class="readout"></span>
            </div>
            <div>
              <span id="percentUnhappyChart"><svg></svg></span>
              <span id="percentUnhappyReadout" class="readout"></span>
            </div>
          </div>
        </div>
      </div>
    </div>
    `;
    el.innerHTML = html;
    this.el = el;
  }

  controlsGui(el) {
    this.gui = new window.dat.GUI({autoPlace: false});
    // #controls
    this.gui.add(this, 'tolerance', 0.0, 1.0, 0.01)
      .name('Intolerance')
      .onChange((value) => {
        this.buildModel();
        if (this.isPlaying) {
          this.start();
        }
      });
    this.gui.add(this, 'fill', 0.0, 1.0, 0.01)
      .onChange((value) => {
        this.buildModel();
        if (this.isPlaying) {
          this.start();
        }
      });
    this.gui.add(this, 'gridSize', 2.0, 40.0, 1)
      .onChange((value) => {
        this.buildModel();
        if (this.isPlaying) {
          this.start();
        }
      });
    this.gui.add(this, 'balance', 0.0, 100.0, 1)
      .onChange((value) => {
        this.buildModel();
        if (this.isPlaying) {
          this.start();
        }
      });

    this.gui.add(this, 'speed', 10, 1000);
    this.gui.add(this, 'dB', -130.0, 0.0).onChange((value) => {
      this.sound.dB = value;
    });
    // select sonifier

    this.gui.add(this, 'start');
    this.gui.add(this, 'stop');
    this.gui.add(this, 'restart');
    this.gui.add(this, 'randomize');

    this.addSoundSelector();
    this.addSoundParamControls();

    document.getElementById('controls')
      .appendChild(this.gui.domElement);
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
      this[name] = this.sound.params[name] || spec.default;
      this.soundParams.push(c);
    });
  }

  buildModel() {
    var totalAgents = this.fill * (Math.pow(this.gridSize, 2) - 1);
    var n2 = (this.balance / 100.0) * totalAgents;
    var n1 = totalAgents - n2;

    this.model = new SegregationModel(this.gridSize, this.tolerance, n1, n2);
    this.model.doOnCompleted(() => this.stop());

    var multicast = this.model.publish();
    this.view.setSubject(multicast, this.model.params());
    multicast.connect();
    this.model.next();
    this.sound.setSubject(multicast, this.model.params());
  }

  randomize() {
    this.stop();
    this.tolerance = rnd(0.1, 0.9);
    this.fill = rnd(0.25, 0.95);
    this.gridSize = Number.parseInt(rnd(10, 100));
    this.balance = Number.parseInt(rnd(10, 90));
    this.speed = rnd(20, 1000);

    this.sound.randomize();
    this.addSoundParamControls();

    for (let i in this.gui.__controllers) {
      this.gui.__controllers[i].updateDisplay();
    }

    this.restart();
  }

  static synthDefs() {
    return BlipBlop.synthDefs();
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
