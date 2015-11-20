
import Model from './model';

describe('SegregationModel', function() {

  it('should construct and init itself', function() {
    var m = new Model();
    expect(m).toBeTruthy();
  });

  it('should construct and init itself with params', function() {
    var m = new Model(30, 0.3, 427, 428);
    expect(m).toBeTruthy();
  });

  it('subscribe and stream once', function() {
    // size=30, tolerance=0.3, n1=427, n2=428
    var m = new Model(30, 0.3, 427, 428);
    var once = false;
    var s = m.subscribe((val) => {
      once = true;
    });
    m.next();
    expect(once).toBe(true);
  });

  it('subscribe and stream fill complete', function() {
    var m = new Model(30, 0.3, 427, 428);
    var complete = false;
    var s = m.subscribe((val) => {
      complete = true;
    }, null, () => complete = true);

    while (!complete) {
      m.next();
    }
    expect(complete).toBe(true);
    // expect the universe not to have experienced heat dath
    // while this continues streaming off into the void of eternity...
  });
});
