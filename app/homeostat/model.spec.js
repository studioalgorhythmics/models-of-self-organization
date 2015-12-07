
import Homeostat from './model';

describe('Homeostat', function() {

  it('should construct and init itself', function() {
    var m = new Homeostat();
    expect(m).toBeTruthy();
  });

  it('should return next repeatedly', function() {
    var m = new Homeostat();
    var e = m.next();
    expect(e).toBeTruthy();
    var f = m.next();
    expect(e).toBeTruthy();
  });

});
