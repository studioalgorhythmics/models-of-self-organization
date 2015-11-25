
/*
  Derived from https://github.com/mattwigway/segregation.js
   Copyright 2013 Matthew Wigginton Conway
   Apache License, Version 2.0
*/
var d3 = require('d3');

/**
 * d3 view for a SegregationModel
 *
 * The model is hot-swappable. The view subscribes to the model
 * and displays the agents, cells and the game board.
 * Also maintains a statistics sidebar that graphs the progress of
 * the simulation.
 */
export default class SegregationView {

  /**
   *
   * @param {String} boardEl - eg. '#board svg'
   * @param {String} statisticsEl - eg. '#statistics'
   * @param {number} pxSize - size in pixels of the sides of the board.
   *      This should be the same as the css specifies.
   */
  constructor(boardEl, statisticsEl, pxSize) {

    this.pxSize = Number(pxSize);
    this.element = d3.select(boardEl)
                      .attr('width', String(this.pxSize) + 'px')
                      .attr('height', String(this.pxSize) + 'px');

    this.meanPercentAlike = [];
    this.percentUnhappy = [];

    this.makeStatistics(statisticsEl);

    // build the display board
    this.board = this.element.append('g');
  }

  /**
   * Set a new model and subscribe to it, unsubscribing from any previously running model.
   *
   * @param {SegregationModel} stream - an Observerable. Could be a SegregationModel or if that is published then it produces an ObservereableSequence for multi-cast to many observers.
   * @param {Object} params - the model's settings like tolerance, size, n1, n2
   */
  setSubject(stream, params) {
    if (this.subscription) {
      this.subscription.dispose();
    }

    this.modelParams = params;

    // history of steps
    this.meanPercentAlike = [];
    this.percentUnhappy = [];

    this.percentAlikeChart.select('line')
      .attr('y1', this.vscale(params.tolerance * 100))
      .attr('y2', this.vscale(params.tolerance * 100));

    this.subscription = stream.subscribe((event) => {
      // console.log(event);
      this.update(event);
    }, (error) => {
      console.error('Error in model stream:', error);
    }, () => {
      console.log('Game over');
    });
  }

  /**
   * Initialize the statistics sidebar.
   *
   * d3 seems to require the SVG element to exist in the markup
   * when its inside of Electron. Usually you can append svg elements
   * programmatically.
   *
   * @param {String} el - an element or id eg. '#statistics'
   *        of an existing html dom element on the document.
   */
  makeStatistics(el) {
    var statistics = d3.select(el);

    this.percentUnhappyReadout = statistics.select('#percentUnhappyReadout');
    this.percentAlikeReadout = statistics.select('#percentAlikeReadout');

    this.percentAlikeChart = statistics.select('#percentAlikeChart svg')
        .attr('width', 250)
        .attr('height', 100)
        .append('g');

    var percentUnhappyChart = statistics.select('#percentUnhappyChart svg')
        .attr('width', 250)
        .attr('height', 100)
        .append('g');

    // add scales
    function initChart(i) {
      i.append('text')
          .attr('x', 0)
          .attr('y', 10)
          .attr('class', 'scale')
          .text('100');

      i.append('text')
          .attr('x', 0)
          .attr('y', 98)
          .attr('class', 'scale')
          .text('0');

      i.append('line')
          .attr('x1', 0)
          .attr('y1', 1)
          .attr('x2', 250)
          .attr('y2', 1)
          .attr('class', 'gridline');

      i.append('line')
          .attr('x1', 0)
          .attr('y1', 99)
          .attr('x2', 250)
          .attr('y2', 99)
          .attr('class', 'gridline');
    }
    initChart(percentUnhappyChart);
    initChart(this.percentAlikeChart);

    this.vscale = d3.scale.linear()
        .domain([0, 100])
        .range([100, 0]);

    this.hscale = d3.scale.linear()
        .domain([0, this.meanPercentAlike.length - 1])
        .range([0, 250]);

    this.lineGenerator = d3.svg.line()
        .x((d, i) => this.hscale(i))
        .y((d) => this.vscale(d));

    this.percentAlikeLine = this.percentAlikeChart
        .append('path')
        .attr('class', 'path');

    this.percentUnhappyLine = percentUnhappyChart
        .append('path')
        .attr('class', 'path');

    // show the threshold
    this.percentAlikeChart
        .append('line')
        .attr('x1', 0)
        .attr('x2', 250)
        // would have to update this when model changes
        .attr('y1', this.vscale(0.3 * 100))
        .attr('y2', this.vscale(0.3 * 100))
        .attr('class', 'threshold');

    // label
    this.percentAlikeChart
        .append('text')
        .attr('x', 157)
        .attr('y', 10)
        .text('MEAN LIKE NEIGHBORS')
        .attr('class', 'scale');

    percentUnhappyChart
        .append('text')
        .attr('x', 172)
        .attr('y', 10)
        .text('UNHAPPY AGENTS')
        .attr('class', 'scale');
  }

  /**
   * Called when model pushes a new event
   *
   * @param {Object} event
   */
  update(event) {
    // determine appropriate radius, leaving some padding
    var cellWidth = this.pxSize / this.modelParams.size;
    var radius = cellWidth * 0.45;

    var circles = this.board.selectAll('circle').data(event.cells);

    circles.exit().remove();
    circles.enter().append('circle')
      .attr('title', (d) => d.coords.row + ', ' + d.coords.col);

    circles
      .attr('r', radius)
      .attr('class', (d) => (d.group || 'vacant') + ' ' + (d.happy || ''))
      .attr('transform', (d) => this.getTransformForCell(d, cellWidth));

    // push to history stack
    this.meanPercentAlike.push(event.meanPercentAlike);
    this.percentUnhappy.push(event.percentUnhappy);

    this.hscale.domain([0, this.meanPercentAlike.length - 1]);

    this.percentUnhappyLine.attr('d', this.lineGenerator(this.percentUnhappy));
    this.percentAlikeLine.attr('d', this.lineGenerator(this.meanPercentAlike));

    this.percentUnhappyReadout
      .text('' + Math.round(event.percentUnhappy) + '%');
    this.percentAlikeReadout
      .text('' + Math.round(event.meanPercentAlike) + '%');
  }

  /**
    * Get an SVG transform attribute for the center of cell i
    *
    * @param {int} cell - cell index
    * @param {number} cellWidth - cell width in pixels
    */
  getTransformForCell(cell, cellWidth) {
    const x = cell.coords.col * cellWidth + cellWidth / 2;
    const y = cell.coords.row * cellWidth + cellWidth / 2;
    return 'translate(' + x + ' ' + y + ')';
  }
}
