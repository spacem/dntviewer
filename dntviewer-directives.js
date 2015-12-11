var myapp = angular.module('myapp', ["ngSanitize", "ngCsv", "agGrid"]);


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
