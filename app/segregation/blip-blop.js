
var sc = require('supercolliderjs');

export default class BlipBlop {

  constructor(stream, params) {
    if (stream) {
      this.setSubject(stream, params);
    }
  }

  setSubject(stream, params) {
    if (this.subscription) {
      this.subscription.dispose();
    }
    this.subscription = stream.subscribe((next) => this.update(next));
    this.modelParams = params;
  }

  update(event) {
    console.log('sound', event);
  }
}
