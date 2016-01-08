function DntView() {
  
  this.getNumberedInputs = function(columnName) {
      var inputs = [];
      
      var e = null;
      do {
          e = document.getElementById(columnName + inputs.length);
          if(e != null) {
              inputs.push(e);
          }
      } while(e != null);
      
      return inputs;
  }
  
  this.getNumberedInputValues = function(columnName) {
      var values = [];
      var inputs = this.getNumberedInputs(columnName);
      var numInputs = inputs.length;
      for(var i=0;i<numInputs;++i) {
          values.push(inputs[i].value);
      }
      
      return values;
  }
  
  this.getFullView = function() {
    return this.getView(0,dntReader.data.length);
  }
  
  this.getTranslateLookup = function() {

    var autoTranslate = document.getElementById('autoTranslate');
    if(autoTranslate.checked) {
      var tCols = this.getNumberedInputValues('translate');
      var tlookup = [];
      var numT = tCols.length;
      for(var f=0;f<numT;++f) {
        tlookup[tCols[f]] = true;
      }
      
      return tlookup;
    }
    return [];
  }
  
  this.getView = function(numToSkip, maxResults) {
    var retVal = [];

    var numRows = dntReader.data.length;
    var numCols = dntReader.columnNames.length;

    var allFCols = this.getNumberedInputValues('filterColumn'); 
    var allFValues = this.getNumberedInputValues('filterValue'); 
    var fCols = [];
    var fValues = [];
    var numF = allFCols.length;
    for(var f=0;f<numF;++f) {
      for(var c=0;c<numCols;++c) {
        if(dntReader.columnNames[c].toUpperCase() == allFCols[f].toUpperCase().trim()) {
          fCols.push(dntReader.columnNames[c]);
          fValues.push(allFValues[f]);
          break;
        }
      }
    }
    var numF = fCols.length;
    
    var tlookup = this.getTranslateLookup();

    retVal[0] = [];

    // add headers
    for(var c=0;c<numCols;++c) {
      retVal[0][c] = dntReader.columnNames[c];
    }

    var numSkipped = 0;
    for(var r=0;r<numRows;++r) {

      if(retVal.length > maxResults) {
        break;
      }
      
      var d = dntReader.data[r];
      
      // skip rows that dont match the filters
      var filterFail = false;
      for(var f=0;f<numF;++f) {
        if(dntReader.columnNames.indexOf(fCols[f]) > -1) {
          var checkVal = d[f];
          if(tlookup[fCols[f]]) {
            checkVal = dnTranslations.translate(checkVal);
          }
          
          if(typeof checkVal == "string") {
            if(checkVal.toUpperCase().indexOf(fValues[f].toUpperCase()) == -1) {
              filterFail = true;
            }
          }
          else if(checkVal != fValues[f]) {
            filterFail = true;
          }
        }
      }
      if(filterFail) { continue; }
      
      if(numSkipped < numToSkip) {
        numSkipped++;
        continue;
      }
          
      retVal[retVal.length] = [];
      
      // output the columns
      var val = "";
      for(var c=0;c<numCols;++c) {
        var colName = dntReader.columnNames[c];
        var val = "";
    
        if(tlookup[colName]) {
          val = dnTranslations.translate(d[c]);
        }
        else {
          val = d[c];
        }
        
        retVal[retVal.length-1][c] = val;
      }
    }
    return retVal;
  }
}