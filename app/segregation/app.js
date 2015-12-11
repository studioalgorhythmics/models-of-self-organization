
// local ES6 classes use import
import SegregationModel from  './model';
import SegregationView from  './view';
import BlipBlop from './BlipBlop';
import {minSide, windowSize} from '../utils';

// external npm packages use require
var d3 = require('d3');
var rx = require('rx');
var _ = require('lodash');

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

    var ws = windowSize();
    var width = Math.min(minSide(el), ws.width) - 20 - 250;
    this.view = new SegregationView('#board svg', '#statistics svg', width);

    this.sound = new BlipBlop();
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
    <div class="content segregation">
      <h1>Schelling's Spatial Segregation Model</h1>
      <div id="board"><svg></svg></div>
      <div id="lower">
        <div id="controls"></div>
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
    `;
    el.innerHTML = html;
  }

  controlsGui(el) {
    this.gui = new window.dat.GUI({autoPlace: false});
    // #controls
    this.gui.add(this, 'tolerance', 0.0, 1.0, 0.01).name('Intolerance')
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

    this.gui.add(this, 'speed', 10, 10000);
    this.gui.add(this, 'dB', -130.0, 0.0).onChange((value) => {
      this.sound.dB = value;
    });
    // select sonifier

    this.gui.add(this, 'start');
    this.gui.add(this, 'stop');
    this.gui.add(this, 'restart');

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
