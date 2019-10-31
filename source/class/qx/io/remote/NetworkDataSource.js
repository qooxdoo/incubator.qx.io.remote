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

qx.Class.define("qx.io.remote.NetworkDataSource", {
  extend: qx.core.Object,
  implement: [ qx.io.persistence.IDataSource ],

  construct() {
    this.base(arguments);
    this.__availableJson = {};
    this.__endPoints = [];
  },

  events: {
    "flushing": "qx.event.type.Event"
  },

  members: {
    __endPoints: null,
    __availableJson: null,
    __controller: null,

    /**
     * @Override
     */
    attachToController(controller) {
      this.__controller = controller;
    },

    /**
     * Called during reception of data by an end point to provide the data for objects
     * prior to deserialisation - this is necessary for references and recursive structures
     *
     * @param uuid {String} the UUID of the object
     * @param json {Object} the data
     */
    addAvailableJson(uuid, json) {
      this.__availableJson[uuid] = json;
    },

    /**
     * Reverses the data stored by `addAvailableJson`
     *
     * @param uuid {String}
     */
    removeAvailableJson(uuid) {
      delete this.__availableJson[uuid];
    },

    /**
     * Adds a new endpoint; the endpoint will be removed automatically when it closes
     *
     * @param endpoint {EndPoint} the endpoint to add
     */
    addEndPoint(endPoint) {
      this.__endPoints.push(endPoint);
      endPoint.addListenerOnce("close", () => qx.lang.Array.remove(this.__endPoints, endPoint));

    },

    /**
     * Called to configure the initial state of an end point
     *
     * @param endPoint {EndPoint} the endpoint to initialise
     */
    async openEndPoint(endPoint) {
      let uris = this.__controller.getUriMappings();
      await qx.Promise.all(Object.keys(uris).map(async uri => {
        let obj = uris[uri];
        await this.__controller.put(obj);
        endPoint.sendUriMapping(uri, obj.getUuid());
      }));
    },

    /**
     * Returns the known end points
     *
     * @return {EndPoint[]} list of known, active end points
     */
    getEndPoints() {
      return this.__endPoints;
    },

    /**
     * @Override
     */
    async getDataFromUuid(uuid) {
      return {
        json: this.__availableJson[uuid] || null
      };
    },

    /**
     * @Override
     */
    createUuid() {
      let uuid = qx.util.Uuid.createUuidV4();
      return uuid;
    },

    /**
     * @Override
     */
    async put(uuid, json) {
      this.__endPoints.forEach(endpoint => {
        endpoint.sendObject(uuid, json);
      });
    },

    /**
     * Sets the URI mapping on all endpoints
     *
     * @param uri {String} the URI
     * @param uuid {String} the UUID to map to
     */
    async putUriMapping(uri, uuid) {
      this.__endPoints.forEach(endpoint => endpoint.sendUriMapping(uri, uuid));
    },

    /**
     * Send accumulated property changes to all end points
     *
     * @param uri {String} the URI
     * @param uuid {String} the UUID to map to
     */
    async putPropertyChanges(store) {
      this.__endPoints.forEach(endpoint => endpoint.sendPropertyChanges(store));
    },

    /**
     * @Override
     */
    async remove(uuid) {

    },

    /**
     * @Override
     */
    async flush() {
      await qx.event.Registration.fireEventAsync(this, "flushing", qx.event.type.Event, []);
      await qx.Promise.all(this.__endPoints.map(endpoint => endpoint.flush()));
    }

  }
});
