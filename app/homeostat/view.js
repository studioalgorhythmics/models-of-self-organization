var d3 = require('d3');
var _ = require('lodash');

const drawLinks = true;

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
    var sqrtUnits = Math.sqrt(this.modelParams.numUnits);
    var unitSize = (this.pxSize / sqrtUnits) * 0.5;
    this.unitSize = unitSize;
    // console.log('unitSize', unitSize);
    var linkDistance = unitSize * 5;
    // console.log('linkDistance', linkDistance);
    var charge = (0 - unitSize) * 4;
    charge = -150;
    // charge gets smaller as numUnits increases
    // console.log('charge', charge);

    var force = d3.layout.force();
    force
      .size([this.pxSize, this.pxSize])
      .gravity(0.6)
      .friction(0.5)
      .charge(charge)  // node repulsion
      .linkDistance(linkDistance);

    var unit = this.svg.selectAll('.unit');

    // add units to force layout
    // https://github.com/mbostock/d3/wiki/Force-Layout#nodes
    // This sets and maintains x y on those objects
    this.unitPositions = [];
    for (let i = 0; i < this.modelParams.numUnits; i++) {
      this.unitPositions.push({
        index: i,
        // still coming in from outer space
        // should start in middle
        x: 0.5, // this.pxSize / 2,
        y: 0.5 // this.pxSize / 2
      });
    }

    force.nodes(this.unitPositions);

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

    force.links(linksData);

    if (drawLinks) {
      // should be in a separate g below
      var link = this.svg.selectAll('.link');
      this.links = link.data(linksData);
      this.links.exit().remove();
      this.links.enter()
        .append('line')
        .attr('class', 'link');
    }

    // join units to the force layout managed units
    this.units = unit.data(this.unitPositions);
    this.units.exit().remove();

    this.units
      .enter()
        .append('rect')
        .attr('class', 'unit');
    // .call(force.drag);

    this.units
      .attr('x', (d) => d.x = this.clip(d.x))
      .attr('y', (d) => d.y = this.clip(d.y))
      .attr('width', unitSize)
      .attr('height', unitSize);


    force.on('tick', () => {
      // constrain them by the frame
      // and write values back to the unitPositions
      this.units
        .attr('x', (d) => d.x = this.clip(d.x))
        .attr('y', (d) => d.y = this.clip(d.y));

      if (drawLinks) {
        this.updateLinks();
      }
    });

    force.start();
  }

  clip(v) {
    return Math.max(0, Math.min(this.pxSize - this.unitSize, v));
  }

  update(event) {
    // color crossing through white:
    this.units
      .transition()
      .style('fill', (d, i) => {
        var output = event.units[i].output;
        var level = 1 - Math.abs(output);
        var color = d3.hsl(output > 0 ? 20 : 333, level, level);
        return color.toString();
      });

    // output level as text or needle

    if (drawLinks) {
      this.updateLinks();
    }
  }

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
