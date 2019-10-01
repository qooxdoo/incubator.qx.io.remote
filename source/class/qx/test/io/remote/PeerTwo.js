/**
 * @require(qx.test.io.remote.Person)
 */
qx.Class.define("qx.test.io.remote.PeerTwo", {
  extend: qx.test.io.remote.AbstractPeerApp,

  members: {
    async initPeer(root) {
      // Data source represents the transport (but is transport agnostic)
      let datasource = new qx.io.remote.NetworkDataSource();
      
      // Controller manages the objects and their serialisation across the DataSource
      let ctlr = this._controller = new qx.io.remote.NetworkController(datasource);
      
      // Connect to the parent window because we know that we are in an iframe created by PeerOne
      let endpoint = new qx.io.remote.WindowEndPoint(ctlr, window.parent);
      datasource.addEndPoint(endpoint);
      await endpoint.open();
      
      let grandad = ctlr.getUriMapping("grandad");
      this.initGrandad(grandad);
    },
    
    async initGrandad(grandad) {
      await this.base(arguments, grandad);
      
      let A = qx.core.Assert;
      
      A.assertTrue(!!grandad);
      A.assertEquals("Arthur", grandad.getName()); 
      A.assertEquals(1, grandad.getChildren().getLength());
      let beverly = grandad.getChildren().getItem(0);
      A.assertEquals("Beverly", beverly.getName());
      A.assertEquals(2, beverly.getChildren().getLength());
      let clarice = beverly.getChildren().getItem(0);
      let debbie = beverly.getChildren().getItem(1);
      A.assertEquals("Clarice", clarice.getName());
      A.assertEquals("Debbie", debbie.getName());
      A.assertEquals(1, clarice.getSiblings().getLength());
      A.assertEquals(1, debbie.getSiblings().getLength());
      A.assertTrue(clarice.getSiblings().getItem(0) === debbie);
      A.assertTrue(debbie.getSiblings().getItem(0) === clarice);
    }
  }
});