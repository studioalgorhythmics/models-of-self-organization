var d3 = require('d3');
var _ = require('lodash');

/**
 * options labels for units
 */
const LABELS = [
  '1',
  '2',
  '3',
  '4'
];

/**
 * d3 view for a Homeostat
 *
 * The model is hot-swappable. The view subscribes to the model,
 * but does not get a direct reference to it.
 */
export default class HomeostatView {

  constructor(boardEl, pxSize) {
    this.pxSize = Number(pxSize);
    this.element = d3.select(boardEl);

    this.svg = this.element.append('g');
  }

  /**
   * @param {rx.Observeable} stream - This is actually a published multicasting stream that is consumed by both the view and the sound.
   * @param {Object} model -
   */
  setSubject(stream, model) {
    if (this.subscription) {
      this.subscription.dispose();
    }

    this.model = model;
    this.modelParams = model.params();

    if (stream) {
      this.subscription = stream.subscribe((event) => {
        this.update(event);
      }, (error) => {
        console.error('Error in model stream:', error);
      }, () => {
        console.log('Game over');
      });
    }

    // update the units and lines
    this.initLayout();
  }

  setPxSize(pxSize) {
    this.pxSize = pxSize;

    this.element
      .attr('width', String(this.pxSize) + 'px')
      .attr('height', String(this.pxSize) + 'px');

    var sqrtUnits = Math.sqrt(this.modelParams.numUnits);
    this.unitSize = (this.pxSize / sqrtUnits) * 0.5;

    // update force
    if (this.force) {
      this.force.size([this.pxSize, this.pxSize]);
      this.force.start();
    }
  }

  /**
   * Initialize the nodes, links and force directed layout.
   * Called whenever a new model is set.
   */
  initLayout() {
    // force layout doesn't keep that from overlapping
    // maybe switch to tidy tree
    this.setPxSize(this.pxSize);

    var linkDistance = this.unitSize * 5;
    // console.log('linkDistance', linkDistance);
    var charge = (0 - this.unitSize) * 4;
    charge = -150;
    // charge gets smaller as numUnits increases
    // console.log('charge', charge);

    this.drawLinks = this.modelParams.numUnits <= 20;

    this.force = d3.layout.force();
    this.force
      .size([this.pxSize, this.pxSize])
      .gravity(0.6)
      .friction(0.5)
      .charge(charge)  // node repulsion
      .linkDistance(linkDistance);

    var unit = this.svg.selectAll('.g-unit');

    // add units to force layout
    // https://github.com/mbostock/d3/wiki/Force-Layout#nodes
    // This sets and maintains x y on those objects
    this.unitPositions = [];
    for (let i = 0; i < this.modelParams.numUnits; i++) {
      this.unitPositions.push({
        index: i,
        // still coming in from outer space
        // should start in middle
        x: this.pxSize / 2,
        y: this.pxSize / 2
      });
    }

    this.force.nodes(this.unitPositions);

    // better to use a node tree ?
    var linksData =  [];
    _.each(this.unitPositions, (up, i) => {
      _.each(this.unitPositions, (upb, ii) => {
        if (i !== ii) {
          linksData.push({
            source: i,
            target: ii
          });
        }
      });
    });

    this.force.links(linksData);

    // should be in a separate g below
    var link = this.svg.selectAll('.link');
    if (this.drawLinks) {
      this.links = link.data(linksData);
    } else {
      this.links = link.data([]);
    }
    this.links.exit().remove();
    this.links.enter()
      .append('line')
      .attr('class', 'link');

    // join units to the force layout managed units
    this.units = unit.data(this.unitPositions);
    this.units.exit().remove();

    var ug = this.units
      .enter()
        .append('g')
        .attr('class', 'g-unit')
        .on('click', (d, i) => {
          this.model.randomizeOutput(d.index);
        });

    ug.append('rect')
      .attr({
        class: 'unit',
        width: this.unitSize,
        height: this.unitSize
      });

    ug.append('line')
      .attr('class', 'needle');
    ug.append('text')
      .attr('class', 'label')
      .text((d, i) => LABELS[i] || '')
      .attr({
        x: this.unitSize / 2 - 10,
        y: this.unitSize / 2,
        dy: '.5em'
      });

    // .call(force.drag);

    this.resizeUnits();

    this.force.on('tick', () => {
      this.resizeUnits();
      if (this.drawLinks) {
        this.updateLinks();
      }
    });

    this.setPxSize(this.pxSize);
  }

  clip(v) {
    return Math.max(0, Math.min(this.pxSize - this.unitSize, v));
  }

  resizeUnits() {
    this.units.attr('transform', (d) => {
      // datum is a unitPosition object
      const x = this.clip(d.x);
      const y = this.clip(d.y);

      // write clipped values back to the unitPosition
      d.x = x;
      d.y = y;

      return 'translate(' + x + ' ' + y + ')';
    });

    this.units.selectAll('rect')
      .attr('width', this.unitSize)
      .attr('height', this.unitSize);
  }

  /**
   * Called each time the model produces a new state.
   * event.units is the list of units.
   * Each unit has .weights which is a list of the -1..1 weights used to scale
   * the output of the other units.
   *
   * @param {Object} event - event.units
   */
  update(event) {
    // color crossing through white:
    this.units.selectAll('rect')
      .transition()
      .style('fill', (d) => {
        var output = event.units[d.index].output;
        var level = 1 - Math.abs(output);
        var color = d3.hsl(output > 0 ? 20 : 333, level, level);
        return color.toString();
      });

    const xScale = d3.scale.linear();
    xScale.domain([-1, 1]).range([0, this.unitSize]);

    var needles = this.units.selectAll('.needle');
    needles
      .transition()
      .attr({
        x1: (d, i) => xScale(event.units[d.index].output),
        x2: (d, i) => xScale(event.units[d.index].output),
        y1: 0,
        y2: this.unitSize
      });
  }

  /**
   * Update the lines showing between units showing the
   * summing of the outputs. This can causes a lot of CPU
   * if the number of nodes is high.
   */
  updateLinks() {
    var getUnit = (index) => {
      return this.unitPositions[index];
    };

    // only update if force is still moving
    // going to top left
    var halfWidth =  this.unitSize / 2;

    this.links
      .attr({
        x1: (d, i) => getUnit(d.source.index).x + halfWidth,
        x2: (d, i) => getUnit(d.target.index).x + halfWidth,
        y1: (d, i) => getUnit(d.source.index).y + halfWidth,
        y2: (d, i) => getUnit(d.target.index).y + halfWidth,
      });
    // line strength
  }
}
