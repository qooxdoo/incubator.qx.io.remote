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