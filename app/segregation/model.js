
/*
  Derived from https://github.com/mattwigway/segregation.js
   Copyright 2013 Matthew Wigginton Conway
   Apache License, Version 2.0
*/
var rx = require('rx');

const Group = {
  NONE: 0,
  ONE: 1,
  TWO: 2
};

const Status = {
  NONE: 0,
  HAPPY: 1,
  UNHAPPY: 2
};

/**
 * Schelling's spatial segregation model
 *
 * This is a subclass of https://github.com/Reactive-Extensions/RxJS/blob/master/doc/api/subjects/subject.md
 * and thus is an observeable stream that can be subscribed to.
 */
export default class SegregationModel extends rx.Subject {

  /**
   * @param {int} size - total number of cells
   * @param {float} tolerance - 0..1
   * @param {int} n1 - group1 population size
   * @param {int} n2 - group2 population size
   */
  constructor(size, tolerance, n1, n2) {
    super();
    this.init(size, tolerance, n1, n2);
  }

  /**
   * Initialize the model and internal variables
   */
  init(size, tolerance, n1, n2) {
    this.size = Number(size);
    this.tolerance = Number(tolerance);

    // Make them integers
    n1 = Math.round(n1);
    n2 = Math.round(n2);

    // >= because there must always be one empty cell for an unhappy cell to move to
    if (n1 + n2 >= Math.pow(this.size, 2)) {
      this.onError('Number of agents must be smaller than number of cells!');
      return false;
    }

    // initialize matrix
    this.matrixLen = Math.pow(size, 2);
    this.matrix = new Int8Array(this.matrixLen);
    // initialize to zero
    for (let i = 0; i < this.matrixLen; i++) {
      this.matrix[i] = Group.NONE;
    }

    // populate matrix
    var balance = n1 / (n1 + n2);
    var c1 = 0;
    var c2 = 0;
    for (let ii = 0; ii < n1 + n2; ii++) {
      var cell  = this.getVacantCell();

      if (c1 < n1 && c2 < n2) {
        if (Math.random() < balance) {
          this.matrix[cell] = Group.ONE;
          c1++;
        } else {
          this.matrix[cell] = Group.TWO;
          c2++;
        }
      } else if (c1 < n1) {
        this.matrix[cell] = Group.ONE;
        c1++;
      } else if (c2 < n2) {
        this.matrix[cell] = Group.TWO;
        c2++;
      } else {
        throw new Error('Distribution error: counts equal to n' +
          'but loop still running');
      }
    }

    if (c1 !== n1 || c2 !== n2) {
      throw new Error('Distribution error: distribution does not match specified');
    }

    // populate cell caches
    // cache unhappy cells
    this.cellStatus = new Int8Array(this.matrixLen);
    // cache percent alike
    // stored as 16-bit ints, with 0 being 0% alike and 65535 being 100% alike.
    this.percentAlike = new Uint16Array(this.matrixLen);

    for (let iii = 0; iii < this.matrixLen; iii++) {
      this.cellStatus[iii] = this.getCellStatus(iii);
      this.percentAlike[iii] = Math.round(this.getCellAlike(iii) * 65535);
    }
  }

  /**
   * Iterates the model and sends an event to any/all subscribers.
   *
   * If the model is complete then the subscriber's onComplete handler is called.
   *
   * @returns {boolean} - is everybody happy ?
   */
  next() {
    // find an unhappy cell
    var orig = this.getUnhappyCell();

    if (orig === undefined) {
      // console.log('Everyone is happy!');
      // well, except for the poor people.
      // the rich people won !
      this.onCompleted();
      return false;
    }

    // find a vacant cell to move to
    var dest = this.getVacantCell();

    // move
    this.matrix[dest] = this.matrix[orig];
    // vacate the original
    this.matrix[orig] = Group.NONE;

    var neighbors = this.getNeighbors(orig).concat(this.getNeighbors(dest));
    neighbors.push(orig);
    neighbors.push(dest);

    var changedCells = new Set();
    neighbors.forEach((cell) => {
      let newStatus = this.getCellStatus(cell);
      let changed = this.cellStatus[cell] !== newStatus;
      this.cellStatus[cell] = newStatus;
      let percentAlike = Math.round(this.getCellAlike(cell) * 65535);
      this.percentAlike[cell] = percentAlike;

      if (changed) {
        changedCells.add(cell);
      }
    });

    // send one event with all of them
    const groups = {
      [Group.NONE]: 'vacant',
      [Group.ONE]: 'group1',
      [Group.TWO]: 'group2'
    };
    var allCells = [];
    for (let ii = 0; ii < this.matrixLen; ii++) {
      allCells.push({
        coords: this.getCoordinatesForCell(ii),
        group: groups[String(this.matrix[ii])] || 'vacant',
        unhappy: this.cellStatus[ii] === Status.UNHAPPY,
        pctAlike: this.percentAlike[ii],
        changed: changedCells.has(ii)
      });
    }

    this.onNext({
      cells: allCells,
      changedCells: Array.from(changedCells),
      meanPercentAlike: this.getMeanPercentAlike() * 100,
      percentUnhappy: this.getPercentUnhappy() * 100
    });
    return true;
  }

  /**
   * Randomly choose one item from an array.
   *
   * @param {Array} arr
   */
  randomDraw(arr) {
    return arr[Math.floor(Math.random() * (arr.length))];
  }

  /**
   * Randomly choose a vacant cell
   *
   * @returns {number} - cell index
   */
  getVacantCell() {
    var vacantCells = [];

    for (var i = 0; i < this.matrixLen; i++) {
      if (this.matrix[i] === Group.NONE) {
        vacantCells.push(i);
      }
    }

    return this.randomDraw(vacantCells);
  }

  /**
   * Randomly choose one unhappy cell
   *
   * @returns {number} - cell index
   */
  getUnhappyCell() {
    var unhappyCells = [];
    for (var i = 0; i < this.matrixLen; i++) {
      if (this.cellStatus[i] === Status.UNHAPPY) {
        unhappyCells.push(i);
      }
    }

    return this.randomDraw(unhappyCells);
  }

  isCellUnhappy(cell) {
    return this.getCellAlike(cell) < this.tolerance;
  }

  /**
    * Get the cell indices of a cell's neighbors.
    * Cells at board edges are considered to be neighbors
    * with the opposite edge. ie. Asteroids style wrap around
    */
  getNeighbors(cell) {
    var coords = this.getCoordinatesForCell(cell);
    var r = coords.row;
    var c = coords.col;
    var neighbors = [
        [r - 1, c],
        [r - 1, c + 1],
        [r, c + 1],
        [r + 1, c + 1],
        [r + 1, c],
        [r + 1, c - 1],
        [r, c - 1],
        [r - 1, c - 1]
    ];

    var ret = [];

    for (let i = 0; i < 8; i++) {
      let nb = neighbors[i];
      // correct edge effects
      nb = [this.torus(nb[0]), this.torus(nb[1])];
      ret.push(this.getCellForCoordinates(nb[0], nb[1]));
    }

    return ret;
  }

  /**
   * Cell index to coordinates
   *
   * @param {int} i - The cell
   * @returns {Object} - {row: <int>, col: <int>}
   */
  getCoordinatesForCell(i) {
    var row = Math.floor(i / this.size);
    var col = i % this.size;
    return {row: row, col: col};
  }

  /**
   * Coordinates to cell index
   */
  getCellForCoordinates(row, col) {
    return row * this.size + col;
  }

  /**
   * Get the status of a cell
   *
   * @param {int} i the cell
   * @returns {number} - 0 if vacant, 1 if happy, 2 if unhappy
   */
  getCellStatus(i) {
    if (this.matrix[i] === Group.NONE) {
      return Status.NONE;
    } else {
      return this.isCellUnhappy(i) ? Status.UNHAPPY : Status.HAPPY;
    }
  }

  /**
   * Get the percent-alike of a cell, as a float in [0, 1].
   * @param {int} cell - The cell
   * @returns {int} - amount alike
   */
  getCellAlike(cell) {
    var thisCell = this.matrix[cell];

    var like = 0;
    var total = 0;

    var neighbors = this.getNeighbors(cell);

    for (let i = 0; i < 8; i++) {
      var cellValue = this.matrix[neighbors[i]];
      if (cellValue !== Group.NONE) {
        total++;
        if (cellValue === thisCell) {
          like++;
        }
      }
    }
    return like / total;
  }

  /**
   * Wrap row/coord that are off the board
   * Asteroids style
   */
  torus(i) {
    if (i < 0) {
      return this.size + i;
    }
    if (i >= this.size) {
      return i - this.size;
    }
    return i;
  }

  /**
   * Get the average percent alike for all cells
   */
  getMeanPercentAlike() {
    var accumulator = 0;
    var total = 0;
    for (var i = 0; i < this.matrixLen; i++) {
      if (this.matrix[i] === Group.NONE) {
        continue;
      }
      total++;
      accumulator += this.percentAlike[i] / 65535;
    }

    return accumulator / total;
  }

  /**
   * Get the percentage of unhappy cells
   */
  getPercentUnhappy() {
    var unhappy = 0;
    var n = 0;
    for (var i = 0; i < this.matrixLen; i++) {
      if (this.cellStatus[i] !== Status.NONE) {
        n++;
        if (this.cellStatus[i] === Status.UNHAPPY) {
          unhappy++;
        }
      }
    }
    return unhappy / n;
  }

  params() {
    return {
      size: this.size,
      tolerance: this.tolerance,
      n1: this.n1,
      n2: this.n2
    };
  }
}
