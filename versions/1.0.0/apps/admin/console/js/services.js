'use strict';

var loMod = angular.module('loApp.services', []).value('version', '0.1');

/*
  FileReader service, taken from:
  http://odetocode.com/blogs/scott/archive/2013/07/03/building-a-filereader-service-for-angularjs-the-service.aspx
 */
loMod.factory('FileReader', function($q) {
  var onLoad = function(reader, deferred, scope) {
    return function () {
      scope.$apply(function () {
        deferred.resolve(reader.result);
      });
    };
  };

  var onError = function (reader, deferred, scope) {
    return function () {
      scope.$apply(function () {
        deferred.reject(reader.result);
      });
    };
  };

  var onProgress = function(reader, scope) {
    return function (event) {
      scope.$broadcast('fileProgress',
        {
          total: event.total,
          loaded: event.loaded
        });
    };
  };

  var getReader = function(deferred, scope) {
    var reader = new FileReader();
    reader.onload = onLoad(reader, deferred, scope);
    reader.onerror = onError(reader, deferred, scope);
    reader.onprogress = onProgress(reader, scope);
    return reader;
  };

  var readAsDataURL = function (file, scope) {
    var deferred = $q.defer();

    var reader = getReader(deferred, scope);
    reader.readAsText(file);

    return deferred.promise;
  };

  return {
    readAsDataUrl: readAsDataURL
  };
});

loMod.factory('LoStorage', function($resource) {
  return $resource('/admin/applications/:appId/resources/:storageId', {
    appId : '@appId',
    storageId : '@storageId'
  }, {
    get : {
      method : 'GET'
    },
    getList : {
      method : 'GET',
      params: { fields : '*(*)' }
    },
    create : {
      method : 'POST',
      params : { appId : '@appId'}
    },
    update : {
      method : 'PUT',
      params : { appId : '@appId', storageId : '@storageId'}
    },
    delete : {
      method : 'DELETE',
      params : { appId : '@appId', storageId : '@storageId'}
    },
    getDatastores : {
      method : 'GET',
      url: '/admin/system/mongo',
      params: { fields : '*(*)' }
    }
  });
});

loMod.factory('LoCollection', function($resource) {
  return $resource('/:appId/:storageId/:collectionId', {
    appId : '@appId',
    storageId : '@storageId',
    collectionId : '@collectionId'
  }, {
    check : {
      method : 'GET',
      params: { appId : '@appId', storageId : '@storageId', collectionId: '@collectionId' }
    },
    get : {
      method : 'GET',
      params: { appId : '@appId', storageId : '@storageId', collectionId: '@collectionId', fields : '*(*)' }
    },
    getList : {
      method : 'GET',
      params: { fields : '*(*)' }
    },
    create : {
      method : 'POST',
      params : { appId : '@appId', storageId : '@storageId'}
    },
    update : {
      method : 'PUT',
      params : { appId : '@appId', storageId : '@storageId', collectionId: '@collectionId'}
    },
    delete : {
      method : 'DELETE',
      params : { appId : '@appId', storageId : '@storageId', collectionId: '@collectionId'}
    }
  });
});

loMod.factory('LoCollectionItem', function($resource) {
  return $resource('/:appId/:storageId/:collectionId/:itemId', {
    appId : '@appId',
    storageId : '@storageId',
    collectionId : '@collectionId'
  }, {
    get : {
      method : 'GET',
      params: { appId : '@appId', storageId : '@storageId', collectionId: '@collectionId', itemId: '@itemId' }
    },
    getList : {
      method : 'GET',
      params: { appId : '@appId', storageId : '@storageId', collectionId: '@collectionId', fields : '*(*)' }
    },
    create : {
      method : 'POST',
      params : { appId : '@appId', storageId : '@storageId', collectionId: '@collectionId'}
    },
    update : {
      method : 'PUT',
      params : { appId : '@appId', storageId : '@storageId', collectionId: '@collectionId', itemId: '@itemId'}
    },
    delete : {
      method : 'DELETE',
      params : { appId : '@appId', storageId : '@storageId', collectionId: '@collectionId', itemId: '@itemid'}
    }
  });
});

loMod.factory('LoApp', function($resource) {
  return $resource('/admin/applications/:appId', {
    appId : '@appId'
  }, {
    get : {
      method : 'GET'
    },
    getList : {
      method : 'GET',
      params: { fields : '*(*)' }
    },
    create : {
      method : 'POST',
      url: '/admin/applications/'
    },
    save : {
      method : 'PUT',
      url: '/admin/applications/:appId'
    },
    addResource : {
      method : 'PUT',
      url: '/admin/applications/:appId/resources/:resourceId'
    }
  });
});

loMod.factory('LoStorageLoader', function(LoStorage, $route) {
  return function() {
    return LoStorage.get({
      appId : $route.current.params.appId,
      storageId: $route.current.params.storageId
    }).$promise;
  };
});

loMod.factory('LoStorageListLoader', function(LoStorage, $route) {
  return function() {
    return LoStorage.getList({
      appId : $route.current.params.appId
    }).$promise;
  };
});

loMod.factory('LoCollectionListLoader', function(LoCollection, $route) {
  return function() {
    return LoCollection.get({
      appId: $route.current.params.appId,
      storageId: $route.current.params.storageId
    }).$promise;
  };
});

loMod.factory('LoPushLoader', function(LoPush, $route, $log) {
  return function() {
    return LoPush.get({
        appId : $route.current.params.appId
      },
      function(httpResponse) {
        $log.error(httpResponse);
        return {
          appId : $route.current.params.appId
        };
      }).$promise;
  };
});

loMod.factory('LoAppLoader', function(LoApp, $route) {
  return function() {
    return LoApp.get({
      appId : $route.current.params.appId
    }).$promise;
  };
});

loMod.factory('LoAppListLoader', function(LoApp) {
  return function() {
    return LoApp.getList().$promise;
  };
});

loMod.factory('LoCollectionLoader', function(LoCollection) {
  return function() {
    return LoCollection.get().$promise;
  };
});

loMod.factory('LoPush', function($resource) {
  return $resource('/admin/applications/:appId/resources/push', {
    appId : '@appId'
  }, {
    get : {
      method : 'GET',
      params : { appId : '@appId'}
    },
    update : {
      method : 'PUT',
      params : { appId : '@appId'}
    },
    create: {
      method : 'POST',
      url: '/admin/applications/:appId/resources/',
      params : { appId : '@appId'}
    },
    delete : {
      method : 'DELETE',
      params : { appId : '@appId'}
    },
    ping : {
      method : 'GET',
      url : '/admin/applications/:appId/resources/push/ping'
    }
  });
});

loMod.factory('LoRealmApp', function($resource, LiveOak) {
  return $resource(LiveOak.getAuthServerUrl() + '/admin/realms/:realmId/applications/:appId', {
    realmId : 'liveoak-apps',
    appId: '@appId'
  }, {
    save: {
      method: 'PUT'
    },
    create: {
      method: 'POST'
    },
    delete: {
      method: 'DELETE'
    }
  });
});

loMod.factory('LoRealmAppRoles', function($resource, LiveOak) {
  return $resource(LiveOak.getAuthServerUrl() + '/admin/realms/:realmId/applications/:appId/roles/:roleName', {
    realmId : 'liveoak-apps',
    appId: '@appId',
    roleName: '@roleName'
  });
});

loMod.factory('LoRealmRoles', function($resource, LiveOak) {
  return $resource(LiveOak.getAuthServerUrl() + '/admin/realms/:realmId/roles', {
    realmId : 'liveoak-apps'
  });
});

loMod.factory('LoRealmClientRoles', function($resource, LiveOak) {
  return $resource(LiveOak.getAuthServerUrl() + '/admin/realms/:realmId/applications/:appId/scope-mappings/realm', {
    realmId: 'liveoak-apps',
    appId: '@appId'
  });
});

loMod.factory('LoRealmAppClientScopeMapping', function($resource, LiveOak) {
  return $resource(LiveOak.getAuthServerUrl() + '/admin/realms/:realmId/applications/:clientId/scope-mappings/applications/:appId', {
    realmId: 'liveoak-apps',
    appId : '@appId',
    clientId : '@clientId'
  });
});

loMod.factory('LoRealmAppClientScopeMappingLoader', function(LoRealmAppClientScopeMapping, $route) {
  return function(){
    return LoRealmAppClientScopeMapping.query({
      realmId: 'liveoak-apps',
      appId: $route.current.params.appId,
      clientId: $route.current.params.clientId
    }).$promise;
  };
});

loMod.factory('LoRealmAppLoader', function(LoRealmApp, $route) {
  return function(){
    return LoRealmApp.get({
      realmId: 'liveoak-apps',
      appId : $route.current.params.appId
    }).$promise;
  };
});

loMod.factory('LoRealmRolesLoader', function(LoRealmRoles) {
  return function(){
    return LoRealmRoles.query({
      realmId: 'liveoak-apps'
    }).$promise;
  };
});

loMod.factory('LoRealmAppListLoader', function(LoRealmApp) {
  return function(){
    return LoRealmApp.query({
      realmId: 'liveoak-apps'
    }).$promise;
  };
});

loMod.factory('LoRealmAppRolesLoader', function(LoRealmAppRoles, $route) {
  return function(){
    return LoRealmAppRoles.query({
      realmId: 'liveoak-apps',
      appId : $route.current.params.appId
    }).$promise;
  };
});

loMod.factory('LoRealmClientRolesLoader', function(LoRealmClientRoles, $route) {
  return function(){
    return LoRealmClientRoles.query({
      realmId: 'liveoak-apps',
      appId : $route.current.params.appId
    }).$promise;
  };
});


loMod.factory('LoSecurityCollections', function($resource) {
  return $resource('/:appId', {
    appId : '@appId'
  }, {
    get : {
      method: 'GET',
      params: { fields : '*(*)' }
    }
  });
});

loMod.factory('LoSecurityCollectionsLoader', function(LoSecurityCollections, $route) {
  return function(){
    return LoSecurityCollections.get({
      appId : $route.current.params.appId
    }).$promise;
  };
});

loMod.factory('LoSecurity', function($resource) {
  return $resource('/admin/applications/:appId/resources/uri-policy', {
    appId : '@appId'
  }, {
    create : {
      method: 'PUT'
    },
    save : {
      method: 'PUT'
    }
  });
});

loMod.factory('LoSecurityLoader', function(LoSecurity, $route) {
  return function(){
    return LoSecurity.get( {
      appId : $route.current.params.appId
    }).$promise;
  };
});

loMod.factory('LoACL', function($resource) {
  return $resource('/admin/applications/:appId/resources/acl-policy', {
    appId : '@appId'
  }, {
    create : {
      method: 'PUT'
    },
    save : {
      method: 'PUT'
    }
  });
});

loMod.factory('LoACLLoader', function(LoACL, $route) {
  return function(){
    return LoACL.get({
      appId : $route.current.params.appId
    }).$promise;
  };
});

loMod.factory('LoRealmUsers', function($resource, LiveOak) {
  return $resource(LiveOak.getAuthServerUrl() + '/admin/realms/:realmId/users/:userId', {
    realmId : 'liveoak-apps',
    userId : '@userId'
  }, {
    resetPassword : {
      method: 'PUT',
      url: LiveOak.getAuthServerUrl() + '/admin/realms/:realmId/users/:userId/reset-password'
    },
    addRoles : {
      method: 'POST',
      url: LiveOak.getAuthServerUrl() + '/admin/realms/:realmId/users/:userId/role-mappings/applications/:appId'
    },
    deleteRoles : {
      method: 'DELETE',
      url: LiveOak.getAuthServerUrl() + '/admin/realms/:realmId/users/:userId/role-mappings/applications/:appId'
    },
    getRoles: {
      method: 'GET',
      url: LiveOak.getAuthServerUrl() + '/admin/realms/:realmId/users/:userId/role-mappings/applications/:appId/composite',
      isArray: true
    },
    update: {
      method: 'PUT'
    }
  });
});

loMod.factory('LoRealmUserLoader', function(LoRealmUsers, $route) {
  return function(){
    return LoRealmUsers.get({
      userId : $route.current.params.userId
    }).$promise;
  };
});

loMod.factory('LoAppExamples', function($resource) {
  return $resource('/admin/console/resources/example-applications.json',
    {},
    {
      get: {
        method: 'GET',
        url: '/admin/console/resources/liveoak-examples/:parentId/:exampleId/application.json'
      },
      install: {
        method : 'POST',
        url: '/admin/applications/',
        headers: {
          'Content-Type':'application/vnd.liveoak.local-app+json'
        }
      },
      importGit: {
        method : 'POST',
        url: '/admin/applications/',
        headers: {
          'Content-Type':'application/vnd.liveoak.git-app+json'
        }
      }
    });
});

loMod.factory('LoClient', function($resource) {
  return $resource('/admin/applications/:appId/resources/application-clients/:clientId', {
    appId : '@appId',
    clientId: '@clientId'
  }, {
    get : {
      method : 'GET'
    },
    getList : {
      method : 'GET',
      params : { fields: '*(*)' }
    },
    update : {
      method : 'PUT'
    },
    create : {
      method : 'POST',
      params : { appId : '@appId' }
    },
    createResource : {
      method : 'POST',
      url : '/admin/applications/:appId/resources',
      params : { appId : '@appId' }
    },
    getResource : {
      method : 'GET',
      url: '/admin/applications/:appId/resources/application-clients',
      params : { appId : '@appId' }
    },
    delete : {
      method : 'DELETE'
    }
  });
});

loMod.factory('loPushPing', function($resource) {
  return function(url){
    return $resource('/admin/system/ups/module/ping', {}, {
      ping : {
        method : 'GET',
        params : { url : url }
      }
    });
  };
});

loMod.factory('LoBusinessLogicScripts', function($resource) {
  return $resource('/admin/applications/:appId/resources/scripts/:type/:scriptId', {
    appId : '@appId'
  }, {
    get : {
      method : 'GET',
      params : { fields: '*(*)' }
    },
    create: {
      method: 'POST'
    },
    update: {
      method: 'PUT'
    },
    getResource : {
      method : 'GET',
      url: '/admin/applications/:appId/resources/scripts/'
    },
    createResource : {
      method : 'PUT',
      url: '/admin/applications/:appId/resources/scripts',
      params : { appId : '@appId'}
    },
    getSource : {
      method : 'GET',
      url: '/admin/applications/:appId/resources/scripts/:type/:scriptId/script'
    },
    setSource: {
      method: 'POST',
      headers: {
        'Content-Type':'application/javascript'
      }
    }
  });
});

loMod.service('loLiveLoader', function($q, $rootScope, $cacheFactory, loLiveSubscribe){

  var liveCache = $cacheFactory('loLiveCache');

  function interpretParameters(parameters){
    var i;

    if (parameters && angular.isFunction(parameters)) {
      i = parameters();
    } else if (parameters){
      i = parameters;
    } else {
      i = {};
    }

    return i;
  }

  return function(resourceMethod, subscribeUrl, parameters){

    var i = interpretParameters(parameters);

    var defered = $q.defer(),
      cacheKey = subscribeUrl+':'+i,
      cachedObject = liveCache.get(cacheKey);

    if(cachedObject){
      defered.resolve(cachedObject);
      return defered.promise;
    }

    var resource = resourceMethod(i),
      deferedLive = $q.defer(),
      output = {
        resource: resource,
        callbacks: resourceMethod.callbacks,
        subscribeUrl: subscribeUrl,
        parameters: i,
        live: deferedLive.promise
      };

    resource.$promise.then(function(data) {
      deferedLive.resolve(angular.copy(data));
      output.subscribeId = loLiveSubscribe(output);
      return output.subscribeId;
    }).then(function(data){
      output.subscribeId = data;
      return deferedLive.promise;
    }).then(function(data){
      angular.extend(output.live, data);
      defered.resolve(output);
      liveCache.put(cacheKey, output);
      return output.live.$promise;
    });

    return defered.promise;
  };
});

loMod.factory('loLiveSubscribe', function($resource, LiveOak, $rootScope, $q) {
  return function(liveObject){

    var delay = $q.defer(),
        callbacks = liveObject.callbacks;

    function _callback(){
      delay.resolve(LiveOak.subscribe(liveObject.subscribeUrl, function (data, action) {
        $rootScope.$apply(function(){
          if (callbacks[action]) {
            liveObject.live.$promise.then(function(){
              callbacks[action](data, liveObject.live);
            });
          }
        });
      }));
    }

    LiveOak.auth.updateToken(5).success(function() {
      LiveOak.connect('Bearer', LiveOak.auth.token, _callback);
    }).error(function() {
      LiveOak.connect(_callback);
    });

    return delay.promise;
  };
});

loMod.factory('LoLiveCollectionList', function($resource) {
  var res = $resource('/:appId/:storageId', {
    appId : '@appId',
    storageId : '@storageId'
  }, {
    get : {
      method : 'GET'
    }
  });

  res.get.callbacks = {
    create: function (data, liveObject) {
      if(!liveObject.members) {
        liveObject.members = [];
      }

      liveObject.members.push(data);
    },
    delete: function (data, liveObject) {
      if(!liveObject.members) {
        return liveObject;
      }

      for(var i = 0; i < liveObject.members.length; i++){
        if (data.id === liveObject.members[i].id) {
          liveObject.members.splice(i, 1);
          break;
        }
      }
    }
  };

  return res;
});

loMod.factory('LoLiveAppList', function($resource) {

  var res = $resource('/admin/applications/', {}, {
    getList: {
      method: 'GET',
      params: { fields: '*(*)' }
    }
  });

  res.getList.callbacks = {
    create: function (data, liveObject) {
      if(!liveObject.members) {
        liveObject.members = [];
      }

      liveObject.members.push(data);
    },
    delete: function (data, liveObject) {
      if(!liveObject.members) {
        return;
      }

      for(var i = 0; i < liveObject.members.length; i++){
        if (data.id === liveObject.members[i].id) {
          liveObject.members.splice(i, 1);
          break;
        }
      }
    }
  };

  return res;
});

loMod.provider('loRemoteCheck', function() {

  this.delay = 300;

  this.setDelay = function(customDelay) {
    this.delay = customDelay;
  };

  this.$get = ['$rootScope', '$timeout', '$log', function($rootScope, $timeout) {

    var delay = this.delay;

    return function (timeoutPointer, resourceMethod, resourceParameters, callbacks) {

      if (timeoutPointer){
        $timeout.cancel(timeoutPointer);
      }

      var timeoutId = $timeout(function(){
        resourceMethod(resourceParameters, function(data){
          if (callbacks.success){
            callbacks.success(data);
          }
        }, function(error){
          if (callbacks.error){
            callbacks.error(error);
          }
        });
      }, delay);

      return timeoutId;
    };
  }];
});

loMod.service('loJSON', function() {

  this.toStringObject = function(jsonObject){
    var stringObject = {};

    for(var key in jsonObject){
      var dType = typeof jsonObject[key];
      if (dType === 'string'){
        stringObject[key] = '"' + jsonObject[key] + '"';
      } else {
        stringObject[key] = angular.toJson(jsonObject[key]);
      }
    }

    return stringObject;
  };

  this.parseJSON = function(stringObject){
    var jsonObject = {};

    // The doubled casting is to trim off angular stuff like the $$hashKey from properties
    for(var key in angular.fromJson(angular.toJson(stringObject))){

      var value = stringObject[key];

      // If the value is empty then ignore
      if(value === '') {
        // If it's a string
      } else if (value[0] === '"' && value[value.length - 1] === '"') {
        jsonObject[key] = value.substr(1, value.length - 2);
        // If it's a numbers
      } else if (!isNaN(value)) {
        jsonObject[key] = parseFloat(value);
        // If it's a boolean
      } else if (value === 'true' || value === 'false') {
        jsonObject[key] = (value === 'true');
        // If it's null
      } else if (value === 'null') {
        jsonObject[key] = null;
      } else {
        jsonObject[key] = JSON.parse(value);
      }
    }

    return jsonObject;
  };

  this.isValidJSON = function(jsonObject) {

    var valid = true;
    try {
      // The function is false only in case of error
      JSON.parse(jsonObject);
    } catch(e) {
      valid = false;
    }

    return valid;
  };

});

loMod.factory('LoMetrics', function($resource) {
  return $resource('/rhq-metrics/:dataType', {
  });
});

