
// local ES6 classes use import
import SegregationModel from  './model';
import SegregationView from  './view';
import BlipBlop from './BlipBlop';

// external npm packages use require
var d3 = require('d3');
var rx = require('rx');

const boardSize = 500;

/**
 * Application class that connects the model, view, sound and controls together.
 */
class SegregationApp {

  constructor() {
    this.tolerance = 0.3;
    this.fill = 0.95;
    this.gridSize = 30;
    this.balance = 50.0;

    this.speed = 250;
    this.dB = -10;

    this.view = new SegregationView('#board svg', '#statistics', boardSize);
    this.sound = new BlipBlop();
    this.buildModel();

    this.isPlaying = false;

    this.stepperFn = () => {
      this.isPlaying = true;
      this.model.next();
      this.stepper = setTimeout(this.stepperFn, this.ms());
    };
  }

  controlsGui() {
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

    this.gui.add(this, 'speed', 10, 500);
    this.gui.add(this, 'dB', -130.0, 0.0).onChange((value) => {
      this.sound.dB = value;
    });
    // select sonifier

    this.gui.add(this, 'start');
    this.gui.add(this, 'stop');
    this.gui.add(this, 'restart');

    document.getElementById('controls').appendChild(this.gui.domElement);
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
    this.sound.play();
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

  /**
   * Speed in milliseconds
   */
  ms() {
    return 60.0 / this.speed * 1000;
  }
}

export default function main() {

  const app = new SegregationApp();
  app.controlsGui();

  app.buildModel();
  // always playing, ready for events
  app.play();
  // app.start();
}
