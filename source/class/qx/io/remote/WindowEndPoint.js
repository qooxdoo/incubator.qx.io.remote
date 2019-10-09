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

qx.Class.define("qx.io.remote.WindowEndPoint", {
  extend: qx.io.remote.EndPoint,
  
  construct(controller, win) {
    this.base(arguments, controller);
    this.__window = win;
    this.__pending = {};
    window.addEventListener("message", event => this._onMessage(event));
  },
  
  members: {
    __window: null,
    
    isWindow(window) {
      return this.__window === window;
    },
    
    _flushImpl(queuedPackets) {
      this.__window.postMessage(queuedPackets);
    },
    
    async _onMessage(event) {
      if (!this.isWindow(event.source))
        return;
      
      let msgData = event.data;
      let responses = await this._receivePackets(msgData);
      if (responses && responses.length) {
        this.__window.postMessage(responses);
      }
    }
  }
});