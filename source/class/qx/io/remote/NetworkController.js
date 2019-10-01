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