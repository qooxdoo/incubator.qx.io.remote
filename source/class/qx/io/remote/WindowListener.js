/* ************************************************************************

   qooxdoo - the new era of web development

   http://qooxdoo.org

   Copyright:
     2019 Zenesis Ltd http://www.zenesis.com

   License:
     MIT: https://opensource.org/licenses/MIT
     See the LICENSE file in the project's top-level directory for details.

   Authors:
     * John Spackman (https://github.com/johnspackman)

************************************************************************ */
/**
 * TODO
 */
qx.Class.define("qx.io.remote.WindowListener", {
  extend: qx.core.Object,
  
  construct(controller) {
    this.base(arguments);
    this.__controller = controller;
    window.addEventListener("message", event => this._onMessage(event));
  },
  
  members: {
    async _onMessage(event) {
      let datasource = this.__controller.getDataSource();
      let endPoint = datasource.getEndPoints()
        .find(endPoint => endPoint instanceof qx.io.remote.WindowEndPoint && 
          endPoint.isWindow(event.source));
      if (endPoint)
        return null;
      endPoint = new qx.io.remote.WindowEndPoint(this.__controller, event.source);
      endPoint.open();
      await datasource.addEndPoint(endPoint);
      return endPoint._onMessage(event);
    }
    
  }
});