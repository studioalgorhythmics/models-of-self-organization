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
    // force layout doesn't keep that from overlapping
    // switch to tidy tree
    var unitSize = (this.pxSize / Math.sqrt(this.modelParams.numUnits)) * 0.5;
    console.log('unitSize', unitSize);
    var linkDistance = unitSize * 2;
    console.log('linkDistance', linkDistance);
    var charge = (0 - unitSize) * 6;
    console.log('charge', charge);

    var force = d3.layout.force();
    force
      .size([this.pxSize, this.pxSize])
      .charge(charge)  // node repulsion
      .linkDistance(linkDistance);

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
    this.units = unit.data(this.unitPositions);

    this.units.exit().remove();

    this.units
      .enter()
        .append('rect')
        .attr('class', 'unit');

    this.units
      .attr('x', (d) => d.x)
      .attr('y', (d) => d.y)
      .attr('width', unitSize)
      .attr('height', unitSize);

    // link = link.data(graph.links)
    //   .enter().append("line")
    //     .attr("class", "link");

    force.start();
  }

  update(event) {
    // console.log(event);

    // color crossing through white:
    this.units
      .transition()
      .style('fill', (d, i) => {
        var output = event.units[i].output;
        var level = 1 - Math.abs(output);
        var color = d3.hsl(output > 0 ? 20 : 333, level, level);
        // console.log('output', output, color);
        return color.toString();
      });

    // line strength
    // output level
  }
}
