var d3 = require('d3');
var _ = require('lodash');

/**
 * d3 view for a Homeostat
 *
 * The model is hot-swappable. The view subscribes to the model.
 */
export default class HomeostatView {

  constructor(boardEl, pxSize) {
    this.pxSize = Number(pxSize);
    this.element = d3.select(boardEl)
                      .attr('width', String(this.pxSize) + 'px')
                      .attr('height', String(this.pxSize) + 'px');

    this.svg = this.element.append('g');
  }

  setSubject(stream, params) {
    if (this.subscription) {
      this.subscription.dispose();
    }

    this.modelParams = params;

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

  initLayout() {
    var force = d3.layout.force();
    force
      .size([this.pxSize, this.pxSize])
      .charge(-800)  // node repulsion
      .linkDistance(this.pxSize / this.modelParams.numUnits);

    var link = this.svg.selectAll('.link');
    var unit = this.svg.selectAll('.unit');

    force.on('tick', () => {
      link
        .attr('x1', (d) => d.source.x)
        .attr('y1', (d) => d.source.y)
        .attr('x2', (d) => d.target.x)
        .attr('y2', (d) => d.target.y);

      this.units
        .attr('x', (d) => d.x)
        .attr('y', (d) => d.y);
    });

    // add units to force layout
    // https://github.com/mbostock/d3/wiki/Force-Layout#nodes
    // This sets and maintains x y on those objects
    this.unitPositions = [];
    for (let i = 0; i < this.modelParams.numUnits; i++) {
      this.unitPositions.push({index: i});
    }

    force.nodes(this.unitPositions);

    // join units to the force layout managed units
    this.units = unit.data(this.unitPositions)
      .enter()
        .append('rect')
        .attr('class', 'unit')
        .attr('width', 50)
        .attr('height', 50)
        .attr('x', (d) => d.x)
        .attr('y', (d) => d.y);

    // link = link.data(graph.links)
    //   .enter().append("line")
    //     .attr("class", "link");

    force.start();
  }

  update(event) {
    // force layout already does unit position
    // lines are drawn
    // just update the output and weights

    console.log(event);
    // line strength
    // output level
  }
}
