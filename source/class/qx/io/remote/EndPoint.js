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

qx.Class.define("qx.io.remote.EndPoint", {
  extend: qx.core.Object,
  implement: [ qx.io.remote.IConnection ],
  
  construct(controller) {
    this.base(arguments);
    this.__controller = controller;
    this.__linkedUuids = {};
    this.__queuedPackets = [];
    this.__lastPacketId = 0;
    this.__pendingPromises = {};
  },
  
  events: {
    "open": "qx.event.type.Event",
    "close": "qx.event.type.Event"
  },
  
  members: {
    __open: false,
    __sentOpened: false,
    __linkedUuids: null,
    __lastPacketId: 0,
    __queuedPackets: null,
    __pendingPromises: null,
    
    /**
     * Provides means to call methods on a remote object.  
     * 
     * @param uuid {String} the UUID of the object that has the method
     * @param methodName {String} the name of the method
     * @param ...args {...} method parameters
     * @return {Object?} returns whatever the method does
     */
    async callRemoteMethod(uuid, methodName, ...args) {
      if (!this.isOpen())
        throw new Error("Cannot call a method via a closed end point");
      if (!this.__linkedUuids[uuid]) {
        this.error("Cannot call remote method because it is not known");
        return;
      }
      this.sendPropertyChanges();
      let packet = {
          type: "callMethod",
          uuid,
          methodName,
          args,
          promise: new qx.Promise()
        };
      this.__queuedPackets.push(packet);
      this.flush();
      return await packet.promise;
    },
    
    /**
     * Sends an entire object
     * 
     * @param uuid {String} the UUID of the string
     * @param json {Object} the JSON data to send
     */
    sendObject(uuid, json) {
      if (!this.isOpen())
        throw new Error("Cannot send via a closed end point");
      if (this.__linkedUuids[uuid])
        return;
      this.__linkedUuids[uuid] = true;
      this.__queuedPackets.push({
        type: "sendObject",
        uuid,
        json
      });
    },
    
    /**
     * Sends property changes; only sends properties for objects which have already been sent.
     * 
     * @param store {Map} property store
     */
    sendPropertyChanges(store) {
      if (!this.isOpen())
        throw new Error("Cannot send via a closed end point");
      
      let changes = {};
      for (let uuid in store)
        if (this.__linkedUuids[uuid])
          changes[uuid] = store[uuid];
      
      this.__queuedPackets.push({
        type: "sendPropertyChanges",
        changes
      });
    },
    
    /**
     * Sends a URI mapping
     * 
     * @param uri {String} the URI to provide a mapping for
     * @param uuid {String} the UUID of the object to map to that URI
     */
    sendUriMapping(uri, uuid) {
      if (!this.isOpen())
        throw new Error("Cannot send via a closed end point");
      if (!this.__linkedUuids[uuid])
        throw new Error("Cannot set a mapping for an unknown UUID");
      this.__queuedPackets.push({
        type: "sendUriMapping",
        uri,
        uuid
      });
    },
    
    /**
     * Flushes the queued data to the other end
     */
    flush() {
      this.sendPropertyChanges();
      let queuedPackets = this.__queuedPackets;
      this.__queuedPackets = [];
      queuedPackets.forEach(packet => {
        if (packet.promise) {
          packet.packetId = ++this.__lastPacketId;
          this.__pendingPromises[packet.packetId] = packet.promise;
          delete packet.promise;
        }
      });
      this._flushImpl(queuedPackets);
    },
    
    /**
     * Implementation specific delivery of packets
     * 
     * @param queuedPackets {Object[]} the packets
     */
    _flushImpl(queuedPackets) {
      throw new Error("No implementation for " + this.classname + "._flushImpl"); 
    },

    /**
     * Whether the end point is open
     * 
     * @return {Boolean}
     */
    isOpen() {
      return this.__open;
    },
    
    /**
     * Called to open the connection
     */
    async open() {
      if (this.isOpen())
        throw new Error("Cannot open an already open end point");
      this.__open = true;
      let promise = new qx.Promise();
      this.__queuedPackets.push({
        type: "open",
        promise
      });
      this.flush();
      return await promise;
    },
    
    /**
     * Closes the connection
     */
    close() {
      if (!this.isOpen())
        throw new Error("Cannot close an already closed end point");
      this.__open = false;
      this.__queuedPackets.push({
        type: "close"
      });
      this.flush();
    },
    
    /**
     * Called by implementations to receive data from the other side
     * 
     * @param packets {Object[]}
     * @return responses {Object[]} responses to send back
     */
    async _receivePackets(packets) {
      let datasource = this.__controller.getDataSource();
      let responses = [];
      console.log(`${qx.core.Init.getApplication().classname}: receive = ${JSON.stringify(packets, null, 2)}`);
      packets.forEach(packet => {
        if (packet.type == "sendObject") {
          datasource.addAvailableJson(packet.uuid, packet.json);
        }
      });
      
      let promises = [];
      let waitForAll = async () => {
        if (promises.length)
          await qx.Promise.all(promises);
        await this.__controller.waitForAll();
        promises = [];
      };

      for (let i = 0; i < packets.length; i++) {
        let packet = packets[i];
        
        if (packet.type == "sendObject") {
          let promise = qx.Promise.resolve(this.__controller.getByUuidNoWait(packet.uuid, true))
            .then(obj => {
              if (obj) {
                this.__linkedUuids[packet.uuid] = true;
                this.__controller.watchObject(obj);
              }
            });
          promises.push(promise);
          
        } else if (packet.type == "sendPropertyChanges") {
          let changes = packet.changes;
          let tmp = Object.keys(changes).map(async uuid => this.__controller.restoreRemoteChanges(uuid, changes[uuid]));
          qx.lang.Array.append(promises, tmp);
          
        } else if (packet.type == "callMethod") {
          await waitForAll();
          let uuid = packet.uuid;
          let object = await this.__controller.getByUuid(uuid);
          let result = await object[packet.methodName].call(object, packet.args||[]);
          responses.push({
            originPacketId: packet.packetId,
            type: "return",
            result: result
          });
          
        } else if (packet.type == "sendUriMapping") {
          if (!packet.uuid) {
            this.__controller.addUriMapping(packet.uri, null);
          } else {
            let promise = qx.Promise.resolve(this.__controller.getByUuidNoWait(packet.uuid, true))
              .then(obj => this.__controller.receiveUriMapping(packet.uri, obj));
            
            promises.push(promise);
          }
          
        } else if (packet.type == "return") {
          await waitForAll();
          let promise = this.__pendingPromises[packet.originPacketId];
          delete this.__pendingPromises[packet.originPacketId];
          if (packet.result === undefined)
            promise.resolve();
          else
            promise.resolve(packet.result);
          
        } else if (packet.type == "close") {
          this.__open = false;
          this.fireEvent("close");
          
        } else if (packet.type == "open") {
          if (this.__sentOpened)
            this.error("Unexpected open after opened has been sent");
          this.__openOriginPacketId = packet.packetId;
          this.__controller.grabPutQueue();
          try {
            await this.__controller.getDataSource().openEndPoint(this);
            this.fireEvent("open");
            this.__queuedPackets.push({
              originPacketId: this.__openOriginPacketId,
              type: "return"
            });
          } finally {
            this.__controller.releasePutQueue();
          }
          /*
          if (!this.__sentOpened) {
            responses.push({
              originPacketId: this.__openOriginPacketId,
              type: "return"
            });
            this.__sentOpened = true;
          }
          */
        }
      }
      await waitForAll();
      
      packets.forEach(packet => {
        if (packet.type == "sendObject") {
          datasource.removeAvailableJson(packet.uuid, packet.values);
        }
      });
      
      console.log(`${qx.core.Init.getApplication().classname}: responses = ${JSON.stringify(responses, null, 2)}`);
      return responses;
    }
  }
});