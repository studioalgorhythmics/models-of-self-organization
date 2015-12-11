
import segregation from './../segregation/app';
import homeostat from './../homeostat/app';

// var jetpack = require('fs-jetpack');
// var jade = require('jade');
// var path = require('path');

// needs to be relative to build/
// const tpl = path.join(__dirname, 'body.jade');

export default class ModelSwitcher {

  constructor(el) {
    this.el = el;

    this.models = {
      segregation,
      homeostat
    };
  }

  showIndex() {
    // var vars = {
    //   models: this.models
    // };
    // var html = jade.render(jetpack.read(tpl), vars);
    // console.log(html);
    // this.el.innerHTML = html;
  }

  selectModel(name) {
    if (this.app) {
      this.app.unload();
    }
    // this.app = this.models[name](this.el);
  }

  /**
   * Boot supercollider
   */
  play() {
    // this.supercollider =
  }

}
