const fs = qx.util.Promisify.fs;

qx.Class.define("qx.test.io.remote.TestPropertyChanges", {
  extend: qx.dev.unit.TestCase,

  members: {
    testWatch() {
      const doTest = async () => {
        let db = new qx.io.persistence.db.MemoryDatabase();
        let ctlr = new qx.io.persistence.Controller(db);
        await db.open();
        
        let p1 = new qx.test.io.remote.Person().set({ name: "Peter" });
        await ctlr.put(p1);
        let uuid = p1.getUuid();
        
        p1.setName("Paul");
        let pcs = ctlr.getPropertyChangeStore();
        this.assertTrue(!!pcs[uuid]);
        this.assertEquals("Paul", pcs[uuid].setValue.name);
        
        let c1 = new qx.test.io.remote.Person().set({ name: "Rod" });
        let c2 = new qx.test.io.remote.Person().set({ name: "Jane" });
        let c3 = new qx.test.io.remote.Person().set({ name: "Freddy" });
        p1.getChildren().push(c1);
        p1.getChildren().push(c2);
        p1.getChildren().push(c3);
        this.assertTrue(!!pcs[uuid].arrayChange);
        this.assertEquals(3, pcs[uuid].arrayChange.children.length);
        this.assertEquals(c1.getUuid(), pcs[uuid].arrayChange.children[0].added[0].uuid);
        this.assertEquals(c2.getUuid(), pcs[uuid].arrayChange.children[1].added[0].uuid);
        this.assertEquals(c3.getUuid(), pcs[uuid].arrayChange.children[2].added[0].uuid);
      };
      
      doTest().then(() => this.resume());
      this.wait();
    }
  }
});
