var myapp = angular.module('myapp', ["ngSanitize", "ngCsv", "agGrid"]);

// this is used by the csv export
myapp.controller('myctrl', function ($scope, $http) {
    $scope.getArray = function() {
        
        $scope.filename = dntReader.fileName;
        return dntView.getFullView();
    };

    $scope.getHeader = function () {
        return "";
    };

    $scope.gridOptions = {
        enableFilter: true
    };
});
