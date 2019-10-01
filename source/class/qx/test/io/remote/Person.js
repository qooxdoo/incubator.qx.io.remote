qx.Class.define("qx.test.io.remote.Person", {
  extend: qx.io.persistence.Object,
  
  construct(name) {
    this.base(arguments);
    if (name)
      this.setName(name);
    this.setSiblings(new qx.data.Array());
    this.setChildren(new qx.data.Array());
    this.getChildren().addListener("change", evt => {
      let data = evt.getData();
      if (data.removed) {
        data.removed.forEach(item => item.setParent(null));
      }
      if (data.added) {
        data.added.forEach(item => item.setParent(this));
      }
    });
  },
  
  properties: {
    name: {
      check: "String",
      event: "changeName",
      "@": qx.io.persistence.anno.Property.DEFAULT
    },
    
    age: {
      init: 0,
      check: "Integer",
      event: "changeAge",
      "@": qx.io.persistence.anno.Property.DEFAULT
    },
    
    parent: {
      init: null,
      nullable: true,
      check: "qx.test.io.remote.Person",
      event: "changeParent",
      "@": qx.io.persistence.anno.Property.DEFAULT
    },
    
    children: {
      check: "qx.data.Array",
      transform: "_transformArray",
      event: "changeChildren",
      "@": [ 
        qx.io.persistence.anno.Property.DEFAULT
      ]
    },
    
    siblings: {
      check: "qx.data.Array",
      transform: "_transformArray",
      event: "changeSiblings",
      "@": [ 
        qx.io.persistence.anno.Property.DEFAULT
      ]
    }
  },
  
  members: {
    _transformArray(value, oldValue) {
      if (!oldValue)
        oldValue = new qx.data.Array();
      if (value)
        oldValue.replace(value);
      else
        oldValue.removeAll();
      return oldValue;
    }
  }
});