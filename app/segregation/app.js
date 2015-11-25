
import SegregationModel from  './model';
import SegregationView from  './view';

var d3 = require('d3');
var rx = require('rx');

export default function run() {

  var model;
  var stepper;
  const view = new SegregationView('#board svg', '#controls', '#statistics',
    model, 300);

  function start() {
    // initial
    model.next();

    stepper = setInterval(() => {
      model.next();
    }, 300);

    model.doOnCompleted(stop);
  }

  function stop() {
    clearTimeout(stepper);
    stepper = null;
  }

  /**
   * Create a stream of values from an html input
   */
  function inputStream(id) {
    let el = document.getElementById(id);
    return rx.Observable.fromEvent(el, 'input')
      .map(() => {
        return parseFloat(el.value);
      })
      .startWith(parseFloat(el.value));
  }

  function runModel() {
    if (stepper) {
      stop();
    }

    // controls
    d3.selectAll('.clearme').html('');

    /**
     * Combine all the html inputs into a single stream with the latest values
     */
    let controls = rx.Observable.combineLatest(
      inputStream('tolerance'),
      inputStream('size'),
      inputStream('fill'),
      inputStream('balance'),
      // map values into a dictionary
      (tolerance, size, fill, balance) => {
        return {
          tolerance: tolerance,
          size: size,
          fill: fill,
          balance: balance
        };
      }
    );

    /**
     * When values change, create a new model and run it.
     */
    controls.subscribe((values) => {
      var totalAgents = values.fill * (Math.pow(values.size, 2) - 1); // there needs always to be a single vacant square
      // 427.5
      var n2 = values.balance * totalAgents;
      // 427.5
      var n1 = totalAgents - n2;

      model = new SegregationModel(values.size, values.tolerance, n1, n2);
      view.setModel(model);
      // or call it once for init
      // and wait for start button
      start();
    });

    /**
     * Update the readouts when values change
     */
    controls.subscribe((values) => {
      for (let key in values) {
        document.getElementById(key + '-readout').value =
          (key === 'size') ?
            values[key] :
            '' + Math.round(values[key] * 100) + '%';
      }
    });

  }

  // bind go button on page to start it again

  runModel();
}