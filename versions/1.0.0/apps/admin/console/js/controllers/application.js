'use strict';

var loMod = angular.module('loApp.controllers.application', []);

loMod.controller('AppListCtrl', function($scope, $rootScope, $routeParams, $location, $modal, $filter, $http, $route, Notifications, loAppList, LoApp, LoStorage, LoPush, LoRealmApp, LoClient, LoBusinessLogicScripts) {

  $rootScope.hideSidebar = true;

  delete $rootScope.curApp;

  $scope.applications = [];
  $scope.exampleApplications = [];

  $scope.createdId = $routeParams.created;

  $scope.modalUploadSPA = function(app) {
    $scope.uploadApp = app;
    $modal.open({
      templateUrl: '/admin/console/templates/modal/application/upload-spa.html',
      controller: UploadSPAModalCtrl,
      scope: $scope
    });
  };

  var UploadSPAModalCtrl = function ($scope, $modalInstance, $log, LoApp) {

    $scope.setFormScope= function(scope){
      $scope.modalScope = scope;
      $scope.modalScope.progress = 0;

      $scope.modalScope.$on('fileProgress', function(e, progress) {
        $scope.modalScope.progress = progress.loaded / progress.total;
      });
    };

    $scope.getFile = function () {
      $scope.fileName = $scope.modalScope.file.name;
      $scope.$apply();
    };

    $scope.uploadSPA = function() {
      $modalInstance.freeze(true);

      $scope.modalScope.progress = 0;
      $scope.modalScope.inProgress = true;

      if (!$scope.uploadApp.hasAppResource) {
        new LoApp({type:'filesystem', config:{directory:'${application.dir}/app/'}}).$addResource({appId: $scope.uploadApp.id, resourceId: 'app'}, function() {
          new LoApp({'html-app':'/app/index.html'}).$save({appId: $scope.uploadApp.id}, function() {
            /* FIXME: ammendonca: this must be removed.. but live reload doens't seem to be picking it... */
            $scope.uploadApp.htmlapp = '/' + $scope.uploadApp.id + '/app/index.html';
            /* FIXME: end */
            doUploadSPA();
          });
        });
      }
      else {
        doUploadSPA();
      }
    };

    var doUploadSPA = function() {
      var uploadUrl = '/admin/applications/' + $scope.uploadApp.id +  '/resources/app/upload?clean=true&overwrite=true';
      $http.put(uploadUrl, $scope.modalScope.file, {
        headers: {
          'content-type': 'application/zip',
          'accept': 'application/zip'
        },
        transformRequest: angular.identity
      }).success(
        function() {
          Notifications.success('The single page application for "' + $scope.uploadApp.id + '" has been uploaded.');

          if ($modalInstance && !$modalInstance.loClosed) {
            $modalInstance.close();
          }
        }
      ).error(
        function() {
          Notifications.error('An error occured while uploading/processing the file.');
          $scope.modalScope.progress = 0;
          $scope.modalScope.isError = true;
        }
      );
    };

    $scope.cancel = function () {
      $modalInstance.dismiss('cancel');
    };

    $scope.clear = function () {
      angular.element('#data-file').val(null);
      $scope.modalScope.file = undefined;
      $scope.fileName = '';
      $scope.modalScope.inProgress = false;
      $scope.modalScope.isError = false;
      $scope.modalScope.progress = 0;
    };

  };


  var increaseStorages = function(app) {
    return function (resources) {
      if (resources.members) {
        for (var j = 0; j < resources.members.length; j++) {
          if (resources.members[j].hasOwnProperty('type') && resources.members[j].type === 'mongo') {
            app.mongoStorages++;
          }
          else if (resources.members[j].hasOwnProperty('upsURL')) {
            app.push = resources.members[j];
          }
          else if (resources.members[j].hasOwnProperty('script-directory')) {
            LoBusinessLogicScripts.get({appId: app.id}).$promise.then(getScriptsInfo(app));
          }
          else if (resources.members[j].id === 'app') {
            app.hasAppResource = true;
          }
        }
      }
    };
  };

  var getScriptsInfo = function(app) {
    return function (data) {
      app.scripts = [];
      app.scriptsCount = 0;
      for(var i = 0; i < data.members.length; i++) {
        app.scripts.push({type: data.members[i].id, count: data.members[i].count});
        app.scriptsCount += data.members[i].count;
      }
    };
  };

  $scope.liveMembers = loAppList.live.members;

  $scope.$watchCollection('liveMembers', function(){
    loAppList.live.then(function(){
      $scope.applications = [];
      $scope.exampleApplications = [];
      var filtered = $filter('orderBy')($filter('filter')(loAppList.live.members, {'visible': true}), 'name');
      for (var i = 0; i < filtered.length; i++) {
        var app = {
          id: filtered[i].id,
          name: filtered[i].name,
          visible: filtered[i].visible,
          htmlapp: filtered[i]['html-app'],
          example: filtered[i].example
        };
        app.url = $location.protocol() + '://' + $location.host() + ':' + $location.port() + '/' + app.id + '/';
        app.storage = LoStorage.getList({appId: app.id});
        app.mongoStorages = 0;
        app.storage.$promise.then(increaseStorages(app));

        if (app.example) {
          $scope.exampleApplications.push(app);
        }
        else {
          $scope.applications.push(app);
        }
      }
    });
  });

  // Delete Application
  $scope.modalApplicationDelete = function(appId) {
    $scope.deleteAppId = appId;
    $modal.open({
      templateUrl: '/admin/console/templates/modal/application/application-delete.html',
      controller: DeleteApplicationModalCtrl,
      scope: $scope
    });
  };

  var DeleteApplicationModalCtrl = function ($scope, $modalInstance, $log, LoApp, LoRealmApp, LoClient) {

    $scope.applicationDelete = function (appId) {
      $log.debug('Deleting application: ' + appId);
      LoClient.getList({appId: appId},
      // success
        function (clientApps) {
          LoApp.delete({appId: appId},
            // success
            function (/*value, responseHeaders*/) {
              Notifications.success('The application "' + appId + '" has been deleted.');
              LoRealmApp.delete({appId: appId});
              for (var i = 0; i < clientApps.members.length; i++) {
                LoRealmApp.delete({appId: clientApps.members[i]['app-key']});
              }
              //$route.reload(); -- ammendonca: removed, since it's live refreshed
              $modalInstance.close();
            },
            // error
            function (httpResponse) {
              Notifications.httpError('Failed to delete the application "' + appId + '".', httpResponse);
            }
          );
        }
      );
    };

    $scope.cancel = function () {
      $modalInstance.dismiss('cancel');
    };

  };

  // Create Application
  $scope.modalApplicationCreate = function() {
    $modal.open({
      templateUrl: '/admin/console/templates/modal/application/application-create.html',
      controller: CreateApplicationModalCtrl,
      scope: $scope
    });
  };

  var CreateApplicationModalCtrl = function ($scope, $modalInstance, $log, LoApp) {

    $scope.setupStep = 1; // current step
    $scope.setupSteps = 3; // total steps

    $scope.nextStep = function() {
      $scope.setupStep++;
    };

    $scope.prevStep = function() {
      $scope.setupStep--;
    };

    $scope.stepValid = function() {
      // Step 1: Require name
      switch($scope.setupStep) {
        case 1:
          return $scope.$parent.appModel.id;
        case 2:
          return $scope.$parent.storagePath;
        case 3:
          return !$scope.pushModel ||
            ($scope.pushModel &&
              ($scope.pushModel.upsURL && $scope.pushModel.applicationId && $scope.pushModel.masterSecret) ||
              (!$scope.pushModel.upsURL && !$scope.pushModel.applicationId && !$scope.pushModel.masterSecret));
        default:
          return false;
      }
    };

    $scope.cancel = function () {
      $modalInstance.dismiss('cancel');
    };

    $scope.create = function() {
      var data = {
        id: $scope.appModel.id,
        name: $scope.appModel.id,
        type: 'application',
        config: {
        }
      };

      new LoRealmApp({name: $scope.appModel.id, 'bearerOnly': true}).$create({realmId: 'liveoak-apps'},
        function(/*realmApp*/) {
          LoApp.create(data,
            // success
            function(/*value, responseHeaders*/) {
              // Needed resources.. probably move this to server side in the future
              new LoApp({type:'aggregating-filesystem',config:{directory:'${io.liveoak.js.dir}'}}).$addResource({appId: $scope.appModel.id, resourceId: 'client'});
              new LoApp({type:'keycloak'}).$addResource({appId: $scope.appModel.id, resourceId: 'auth'});
              new LoApp({
                type: 'security',
                config:{
                  policies: [
                    {
                      policyName : 'URIPolicy',
                      policyResourceEndpoint: '/' + $scope.appModel.id + '/uri-policy/authzCheck'
                    },
                    {
                      policyName : 'ACLPolicy',
                      policyResourceEndpoint: '/' + $scope.appModel.id + '/acl-policy/authzCheck',
                      includedResourcePrefixes: [ '/' + $scope.appModel.id ]
                    }
                  ]
                }
              }).$addResource({appId: $scope.appModel.id, resourceId: 'authz'});
              new LoApp({
                type: 'uri-policy',
                config: {
                  rules: [
                    {
                      'uriPattern' : '*',
                      'requestTypes' : [ '*' ],
                      'allowedUsers': [ '*' ]
                    }
                  ]
                }
              }).$addResource({appId: $scope.appModel.id, resourceId: 'uri-policy'});
              new LoApp({type: 'acl-policy', config: {autoRules: []}}).$addResource({appId: $scope.appModel.id, resourceId: 'acl-policy'});
              if($scope.setupType === 'basic') {
                var storageData = {
                  id: $scope.storagePath,
                  type: 'mongo',
                  config: {
                    db: $scope.appModel.id
                  }
                };

                LoStorage.create({appId: $scope.appModel.id}, storageData,
                  // success
                  function(/*value, responseHeaders*/) {
                    if($scope.pushModel && $scope.pushModel.upsURL) {
                      var pushData = {
                        type: 'ups',
                        config: {
                          upsURL: $scope.pushModel.upsURL,
                          applicationId: $scope.pushModel.applicationId,
                          masterSecret: $scope.pushModel.masterSecret
                        }
                      };

                      LoPush.update({appId: $scope.appModel.id}, pushData,
                        // success
                        function (/*value, responseHeaders*/) {
                          Notifications.success('The application ' + data.name + ' has been created with storage and push configured.');
                          redirectOnNewAppSuccess();
                        },
                        // error
                        function (httpResponse) {
                          Notifications.httpError('The application ' + data.name + ' has been created with storage but failed to configure push.', httpResponse);
                          redirectOnNewAppSuccess();
                        }
                      );
                    }
                    else {
                      Notifications.success('The application ' + data.name + ' has been created with storage configured.');
                      redirectOnNewAppSuccess();
                    }
                  },
                  // error
                  function(httpResponse) {
                    Notifications.httpError('The application ' + data.name + ' has been created but failed to configure storage.', httpResponse);
                    redirectOnNewAppSuccess();
                    // TODO: Rollback ?
                  });
              }
              else {
                Notifications.success('The application ' + data.name + ' has been created.');
                redirectOnNewAppSuccess();
              }
            },
            // error
            function(httpResponse) {
              Notifications.httpError('The application ' + data.name + ' could not be created.', httpResponse);
            });
        },
        function(httpResponse) {
          Notifications.httpError('The application ' + data.name + ' could not be created in Keycloak.', httpResponse);
        }
      );

    };

    var redirectOnNewAppSuccess = function() {
      $modalInstance.close();
      //$location.search('created', $scope.appModel.id).path('applications');
      $location.path('applications/' + $scope.appModel.id + '/next-steps');
      // FIXME: Remove once we know about new apps by subscriptions
      LoApp.getList(function(data){
        $rootScope.applications = $filter('filter')(data.members, {'visible': true});
      });
    };
  };

  // We keep this at parent scope so it doesn't go away with [accidental] modal close
  $scope.setupType = 'basic'; // setup type: basic or diy
  $scope.storagePath = 'storage';
  $scope.appModel = {
  };

  // Import Application
  $scope.modalApplicationImport = function() {
    $modal.open({
      templateUrl: '/admin/console/templates/modal/application/application-import.html',
      controller: ImportApplicationModalCtrl,
      scope: $scope
    });
  };

  var ImportApplicationModalCtrl = function ($scope, $modalInstance, $log, LoAppExamples) {
    $scope.sources = [{'id': 'git', 'name': 'Git'}, {'id': 'local', 'name': 'Local Filesystem'}];
    $scope.source = 'git';

    $scope.app = {};

    $scope.cancel = function () {
      $modalInstance.close('cancel');
      $modalInstance.loClosed = true;
    };

    $scope.import = function () {
      $modalInstance.freeze(true);
      if($scope.source === 'git') { delete $scope.app.localPath; }
      else if($scope.source === 'local') { delete $scope.app.url; }
      importApp($scope.app, LoAppExamples, Notifications, $modalInstance, $route);
    };

    var idAuto = true;

    $scope.updateAppId = function() {
      if (idAuto) {
        if ($scope.source === 'local') {
          $scope.app.id = $scope.app.path.replace(/\/$/, '').split('/').pop();
        }
        else {
          $scope.app.id = $scope.app.url.replace(/\/$/, '').replace(/\.git$/, '').split('/').pop() + ($scope.app.branch ? ('_' + $scope.app.branch) : '');
        }
      }
      if ($scope.source === 'git' && $scope.app.url) {
        $scope.app.protocol = ($scope.app.url.indexOf('ssh://') === 0) ? 'ssh' : 'https';
      }
    };

    $scope.manualChange = function() {
      idAuto = false;
    };
  };

});

loMod.controller('NextStepsCtrl', function($scope, $rootScope, $routeParams, currentApp, loStorageList) {

  $rootScope.curApp = currentApp;
  $rootScope.hideSidebar = true;

  $scope.storageList = [];

  /* jshint unused: false */
  angular.forEach(loStorageList.members, function (value, key) {
    if (value.hasOwnProperty('db')) {
      this.push({id: value.id, provider: value.hasOwnProperty('MongoClientOptions') ? 'mongoDB' : 'unknown'});
    }
    else if(value.hasOwnProperty('upsURL')) {
      $scope.pushConfig = value;
    }
  }, $scope.storageList);
  /* jshint unused: true */

  $scope.breadcrumbs = [
    {'label': 'Applications', 'href': '#/applications'},
    {'label': currentApp.name, 'href': '#/applications/' + currentApp.id},
    {'label': 'Next Steps', 'href': '#/applications/' + currentApp.id + '/next-steps'}
  ];

});

loMod.controller('ExampleListCtrl', function($scope, $rootScope, $location, $filter, Notifications, LoAppExamples, LoApp, examplesList, loAppList) {

  $rootScope.hideSidebar = true;

  delete $rootScope.curApp;

  $scope.breadcrumbs = [
    {'label': 'Applications', 'href': '#/applications'},
    {'label': 'Example Applications', 'href': '#/example-applications'}
  ];

  $scope.examples = examplesList;

  for (var i = 0; i < examplesList.length; i++) {
    var example = examplesList[i];

    for(var appIndex in loAppList.live.members){
      var app = loAppList.live.members[appIndex];
      if (app.example === example.id){
        example.installed = true;
        example.path = app.id;
        break;
      }
    }
  }

  $scope.goto = function(example) {
    $location.path('applications/' +  example.id);
  };

  $scope.import = function(example) {
    example.importing = true;

    var parentId = example.path.substr(0, example.path.indexOf('/'));
    var exampleId = example.path.substr(example.path.indexOf('/') + 1);
    var data = {
      id: example.id,
      name: example.id,
      type: 'application'
    };
    var config = LoAppExamples.get({parentId: parentId, exampleId: exampleId},
      function() {
        // FIXME: need to adapt config to match paths, etc...
        new LoApp($.extend(data, config)).$create({},
          function(/*value, responseHeaders*/) {
            new LoApp({}).$addResource({appId: example.id}, function() {
              Notifications.success('The example application "' + example.id + '" has been installed.');
              example.importing = false;
              example.installed = true;
            });
          },
          function(httpResponse) {
            Notifications.httpError('Failed to install the example application "' + example.id + '".', httpResponse);
            example.importing = false;
          }
        );
      },
      function(httpResponse) {
        Notifications.httpError('Failed to retrieve the example application "' + example.id + '" configuration.', httpResponse);
        example.importing = false;
      }
    );
  };

  $scope.install = function(example) {
    importApp(example, LoAppExamples, Notifications);
  };

});

var importApp = function(app, LoAppExamples, Notifications, $modalInstance, $route) {
  app.installing = true;

  var installSuccess = function(value/*, responseHeaders*/) {
    Notifications.success('The application "' + value.name + '" has been installed.');
    app.installing = false;
    app.installed = true;

    if ($modalInstance && !$modalInstance.loClosed) {
      $modalInstance.close();
    }
    if ($route) {
      $route.reload();
    }
  };

  var installFailure = function(httpResponse) {
    Notifications.httpError('Failed to install the application "' + app.id + '".', httpResponse);
    app.installing = false;
  };

  if (app.hasOwnProperty('url')) {
    if (app.usePassphrase) {
      delete app.username;
      delete app.password;
    }
    else {
      delete app.passphrase;
    }
    new LoAppExamples({ id: app.id, url: app.url, branch: app.branch, user: app.username, pwd: app.password, passphrase: app.passphrase }).$importGit({}, installSuccess, installFailure);
  }
  else if (app.hasOwnProperty('path')) {
    new LoAppExamples({ id: app.id, localPath: app.path }).$install({}, installSuccess, installFailure);
  }
};
