
import segregation from './../segregation/app';
import homeostat from './../homeostat/app';

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
    if (this.currentModel === name) {
      return;
    }
    if (this.app) {
      this.app.unload();
    }
    const App = this.models[name];
    if (App) {
      this.app = new App(this.el);
    }
  }

  /**
   * Boot supercollider
   */
  play() {
    // this.supercollider =
  }

}
