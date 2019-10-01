qx.Class.define("qx.test.io.remote.AbstractPeerApp", {
  extend: qx.application.Standalone,

  members: {
    main() {
      this.base(arguments);

      if (qx.core.Environment.get("qx.debug")) {
        qx.log.appender.Native;
        qx.log.appender.Console;
      }

      let doc = this.getRoot();
      
      let root = new qx.ui.container.Composite(new qx.ui.layout.VBox());
      doc.add(root, { left: 0, top: 0, right: 0, bottom: 0 });
      
      this._tb = new qx.ui.toolbar.ToolBar();
      root.add(this._tb);
      
      this._txt = new qx.ui.form.TextArea();
      root.add(this._txt);
      
      return this.initPeer(root);
    },
    
    log(...args) {
      console.log(...args);
      this._txt.setValue((this._txt.getValue()||"") + args.join("") + "\n");
      this._txt.getContentElement().scrollToY(100000);
    },
    
    async initGrandad(grandad) {
      grandad.addListener("changeAge", evt => {
        this.log(`Grandad's age changed to ${evt.getData()}`);
      });
      
      let btn = new qx.ui.toolbar.Button("Change Age");
      this._tb.add(btn);
      btn.addListener("execute", () => {
        this.log(`Button is setting grandad's age to ${grandad.getAge() + 1}`); 
        grandad.setAge(grandad.getAge() + 1);
        this._controller.flush();
      });
      
      btn = new qx.ui.toolbar.Button("Add Child");
      this._tb.add(btn);
      btn.addListener("execute", () => {
        let newChild = new qx.test.io.remote.Person("Child_No_" + (grandad.getChildren().getLength() + 1));
        this.log(`Button is adding child ${newChild.getName()}`); 
        grandad.getChildren().push(newChild);
        grandad.getChildren().forEach(child => {
          if (child !== newChild) {
            child.getSiblings().push(newChild);
            newChild.getSiblings().push(child);
          }
        });
        this._controller.flush();
      });
      
      let beverly = grandad.getChildren().getItem(0);
      btn = new qx.ui.toolbar.Button("Add Grandchild");
      this._tb.add(btn);
      btn.addListener("execute", () => {
        let newChild = new qx.test.io.remote.Person("Beverly_Child_No_" + (beverly.getChildren().getLength() + 1));
        this.log(`Button is adding grandchild ${newChild.getName()}`); 
        beverly.getChildren().push(newChild);
        beverly.getChildren().forEach(child => {
          if (child !== newChild) {
            child.getSiblings().push(newChild);
            newChild.getSiblings().push(child);
          }
        });
        this._controller.flush();
      });
      
      btn = new qx.ui.toolbar.Button("Remove Grandchild");
      this._tb.add(btn);
      btn.addListener("execute", () => {
        if (!beverly.getChildren().getLength()) {
          this.log(`Beverly has no more children to remove`);
          return;
        }
        let oldChild = beverly.getChildren().getItem(0);
        this.log(`Button is removing grandchild ${oldChild.getName()}`); 
        beverly.getChildren().remove(oldChild);
        beverly.getChildren().forEach(child => child.getSiblings().remove(oldChild));
        oldChild.getSiblings().removeAll();
        this._controller.flush();
      });
      
      const traverse = person => {
        person.getChildren().addListener("change", evt => {
          let data = evt.getData();
          (data.removed||[]).forEach(item => this.log(person.getName() + ": removed child " + item.getName()));
          (data.added||[]).forEach(item => {
            this.log(person.getName() + ": added child " + item.getName());
            traverse(item);
          });
        });
        person.getChildren().forEach(traverse);
      };
      traverse(grandad);
    },
    
    async initPeer(root) {
      throw new Error("No implementation for " + this.classname + ".initPeer");
    }
  }
});