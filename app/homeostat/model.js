
var rx = require('rx');
var _ = require('lodash');

const THRESHOLD = 0.005;
const PERTURB_EVERY = 10;

/**
 * -1 .. 1
 */
function rnd() {
  return (Math.random() - 0.5) * 2;
}

/**
 * -1 .. 1
 */
function clip(v) {
  if (v > 1) {
    return 1;
  }
  if (v < -1) {
    return -1;
  }
  return v;
}

class Unit {

  constructor(index, numConnections) {
    this.index = index;
    this.output = rnd(); // -1 1
    this.numConnections = numConnections;
    this.perturbCycle = 0;
    this.randomize();
  }

  randomize() {
    this.weights = _.map(Array(this.numConnections), rnd);
    console.log('rnd', this.index);
  }

  next(outputValues, visc, ei) {
    var output = _.reduce(outputValues, (sum, unitOutput, ui) => {
      return sum + (unitOutput * this.weights[ui]);
    }, 0.0, this);
    // smooth with lag
    var newVal = this.output + (visc * (output - this.output));
    this.output = clip(newVal);

    // if < threshold or clipping then enter perturb mode
    this.perhapsPerturb();
  }

  perhapsPerturb() {
    if (this.perturbCycle === 0) {
      if (this.isConverged() || this.isClipping()) {
        this.randomize();
        this.perturbCycle = 1;
        return true;
      }
    } else if (this.perturbCycle === PERTURB_EVERY) {
      // this.randomize();
      this.perturbCycle = 0;
      return true;
    } else {
      this.perturbCycle += 1;
    }
    return false;
  }

  isConverged() {
    return Math.abs(this.output) <= THRESHOLD;
  }

  isClipping() {
    return Math.abs(this.output) >= 0.999;
  }
}

/**
 * Ross Ashby's Homeostat
 *
 * The original homeostat consisted of four identical units, supplied with DC current, and connected so that the input for each unit consisted of the output from the other three. Each input to each unit was modified by a commutator and a potentiometer which controlled the polarity and strength of the incoming signal respectively. The amount of current reaching each unit was measured by an indicator needle whose stable (or preferred) position was a narrow zone near the center of the dial. The output of each unit was proportional to the distance of the indicator needle from the center position. When the needles of a unit were centered, the current values of the potentiometer/commutator remained unchanging. When the needle diverged from its central position, a relay was closed which energized a mechanism to randomly assign, at 3-second intervals, new values to each of the potentiometer/commutator elements of the unit until the needle returned to its central position.
 * http://www.well.com/~kbk/dissertation/chapter04/
 */
export default class Homeostat extends rx.Subject {

  constructor(numUnits, viscosity) {
    super();
    this.numUnits = numUnits || 4;
    this.viscosity = viscosity || 0.675;
    this.units = _.map(Array(this.numUnits),
      (nil, i) => new Unit(i, this.numUnits));
    this.eventNum = 0;
  }

  unitData(unit) {
    return {
      output: unit.output,
      weights: unit.weights
    };
  }

  next() {
    var outputs = _.map(this.units, (unit) => Math.abs(unit.output));
    _.each(this.units, (unit) => {
      unit.next(outputs, this.viscosity, this.eventNum);
    });
    var event = {
      eventNum: this.eventNum,
      units: this.units  // _.map(this.units, (u) => this.unitData(u))
    };
    this.eventNum += 1;
    this.onNext(event);
    return event;
  }

  params() {
    return {
      numUnits: this.numUnits,
      viscosity: this.viscosity
    };
  }
}
