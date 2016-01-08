var addedFileName;
var addedTFileName;
var reader = null;
var progress = null;
var tprogress = null;
var dataFile = null;
var tFile = null;
var gridOptions = null;

var dntReader = new DntReader(); // loads the binary data
var dnTranslations = new DnTranslations(); // loads the uistring.xml
var dntView = new DntView(); // gives a view onto the loaded data using filters, etc

// helper classes for working with local files
var dntFileUpload = new FileUpload('drop_zone','files','fileForm','list','progress_bar',processFile, true);
var translationFileUpload = new FileUpload('tdrop_zone','tfiles','tFileForm','tlist','tprogress_bar',loadTranslationFile, false);


function updateProgress(msg) {
  progress.textContent = msg;
}

function loadLastData() {
  var tFile = null;
  var loadDnt = false;
  var paramString = window.location.hash; 
  if(paramString == null || paramString.length < 2) {
  }
  else {
    var params = getParams();
    
    var file = params['dnt'];
    // var tFile = params['tfile'];
    var location = params['location'];
    
    if(location != null && location.length > 0) {
      tFile = location + '/' + 'uistring.xml';
    }
    
    var columnLoaderLink = document.getElementById('columnLoaderLink');
    columnLoaderLink.href += "#location=" + location;
    
    if(file == null || file.length < 5) {
    }
    else {
      var autoTranslate = document.getElementById('autoTranslate');
      if(autoTranslate.checked) {
        progress.textContent = "Waiting for translations to load"
        loadDnt = true;
      }
      else {
        dntReader.loadDntFromServerFile(location + '/' + file, updateProgress, refreshTable, updateProgress);
      }
    }
  }
  
  dnTranslations.loadDefaultFile(
    tFile,
    function(msg) {
      tprogress.textContent = msg;
    },
    function() {
      if(loadDnt) {
        dntReader.loadDntFromServerFile(location + '/' + file, updateProgress, refreshTable, updateProgress);
      }
    },
    function(msg) {
      tprogress.textContent = msg;
    });
}

function getParams() {
  var paramString = window.location.hash;
  var paramArray = paramString.substr(1).split("&");
  var params = {};
  for(var p=0;p<paramArray.length;++p) {
    var keyValArray = paramArray[p].split('=');
    if(keyValArray.length == 2) {
      params[keyValArray[0]] = keyValArray[1]
    }
  }
  
  return params;
}

function reloadHostedTFile() {
  var params = getParams();
  var tFile = "uistring.xml";
  var location = params['location'];
  if(location == null) {
    tprogress.textContent = 'location not found in url';
  }
  else {
    localStorage.removeItem('UIStrings');
    dnTranslations.loadDefaultFile(
      location + '/' + tFile,
      function(msg) {
        tprogress.textContent = msg;
      },
      refreshTable,
      function(msg) {
        tprogress.textContent = msg;
    });
  }
}

function dntPageInit() {
  
  if (window.File && window.FileReader && window.FileList && window.Blob) {
    //do your stuff!
  } else {
    alert('The File APIs are not fully supported by your browser.');
  }
  
  progress = document.getElementById('progress_bar');
  tprogress = document.getElementById('tprogress_bar');
  
  translationFileUpload.init();
  dntFileUpload.init();
  
  loadLastData();
}

// function called by this when the translations are ready to load
function loadTranslationFile(file, fileName) {
  dnTranslations.process(
    file, 
    function(msg) {
      tprogress.textContent = msg;
    },
    function() {
      // var loadTranslations = $("#loadTranslations");
      // loadTranslations.hide();
    }
  );
}

// function called by this when the file is ready to load
function processFile(data, fileName) {
  try
  {
    dntReader.processFile(data, fileName);
    refreshTable();
  }
  catch(ex) {
    console.log(ex);
    progress.textContent = "Load failed";
  }
}

// function to refresh the table
function refreshTable() {
  progress.textContent = "Refreshing";
  
  var numCols = dntReader.numColumns;
  var columnDefs = [];
  var tLookup = dntView.getTranslateLookup();
  
  function translationGetter(params) {
    return dnTranslations.translate(params.data[params.colDef.fieldIndex]);
  }
  
  function otherGetter(params) {
    return params.data[params.colDef.fieldIndex];
  }
  
  function floatGetter(params) {
    // four decimals, then strip trailing zeros
    var rounded = params.data[params.colDef.fieldIndex].toFixed(4);
    while(rounded.length > 0 && rounded.lastIndexOf('0') == rounded.length-1) {
      rounded = rounded.substr(0,rounded.length-1);
    }
    return rounded;
  }
  
  for(var c=0;c<numCols;++c) {
    var valueGetter = null;
    var filter = 'number';
    if(dntReader.columnTypes[c] == 1) {
      filter = 'text';
    }
    
    if(dntReader.columnTypes[c] == 4 || dntReader.columnTypes[c] == 5) {
      valueGetter = floatGetter;
    }
    else if(tLookup[dntReader.columnNames[c]]) {
      valueGetter = translationGetter;
      filter = 'text';
    }
    else {
      valueGetter = otherGetter;
    }
    
    columnDefs[c] = {
      headerName: dntReader.columnNames[c], 
      field: dntReader.columnNames[c], 
      fieldIndex: c,
      width: 140, 
      filter: filter, 
      valueGetter : valueGetter
    };
  }
  
  if(gridOptions != null) {
    gridOptions.api.destroy();
  }
  
  gridOptions = {
    columnDefs: columnDefs,
    rowData: dntReader.data,
    enableFilter: true,
    enableSorting: true,
    showToolPanel: true,
    enableColResize: true,
  };
  
  var resultHtml = '<h2>' + dntReader.fileName  + ' <small>' + dntReader.numRows + ' rows in total</small> ';
  var loadResults = document.getElementById('load_results');
  loadResults.innerHTML = resultHtml;
  
  // api.destroy();
  agGridGlobalFunc('#myGrid', gridOptions);
  
  progress.textContent = "Loaded";
}

// function to find an input from a set of numbered inpute
function getInput(name, index, existinginputs) {
  var value = "";
  if(existinginputs != null && index < existinginputs.length) {
  value = existinginputs[index].value;
  }
  return '<input id="' + name + index + '" class="form-control" value="' + value + '" type="text" />';
}

// function to add a row to translatable values
function addTRow() {
  var inputs = dntView.getNumberedInputs('translate');
  var numT = inputs.length;
  
  var html = "";
  var tBoxes = document.getElementById('tBoxes1');
  for(var i=0;i<numT;i+=2) {
    html += getInput('translate', i, inputs);
  }
  html += getInput('translate', numT, null);
  tBoxes.innerHTML = html;
  
  html = "";
  tBoxes = document.getElementById('tBoxes2');
  for(var i=1;i<numT;i+=2) {
    html += getInput('translate', i, inputs);
  }
  html += getInput('translate', numT+1, null);
  tBoxes.innerHTML = html;
}
