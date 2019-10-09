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
 * Controller for serialisation to network
 */
qx.Class.define("qx.io.remote.NetworkController", {
  extend: qx.io.persistence.Controller,
  
  construct(datasource) {
    this.base(arguments, datasource);
    this.__uris = {};
  },
  
  members: {
    __uris: null,
    
    receiveUriMapping(uri, object) {
      if (!object)
        delete this.__uris[uri];
      else
        this.__uris[uri] = object;
    },
    
    getUriMapping(uri) {
      return this.__uris[uri]||null;
    },
    
    async putUriMapping(uri, object) {
      if (!object)
        delete this.__uris[uri];
      else
        this.__uris[uri] = object;
      if (object)
        await this.put(object)
      this.getDataSource().putUriMapping(uri, object ? object.getUuid() : null);
    },
    
    getUriMappings() {
      return this.__uris;
    }
    
  }
});