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
  
    var loadDnt = false;
    var paramString = window.location.hash; 
    if(paramString == null || paramString.length < 2) {
        return;
    }
    
    var paramArray = paramString.substr(1).split("&");
    var params = {};
    for(var p=0;p<paramArray.length;++p) {
        var keyValArray = paramArray[p].split('=');
        if(keyValArray.length == 2) {
            params[keyValArray[0]] = keyValArray[1]
        }
    }
    
    var file = params['dnt'];
    // var tFile = params['tfile'];
    tFile = "uistring.xml";
    var location = params['location'];

    if(file == null || file.length < 5) {
    }
    else {
        var autoTranslate = document.getElementById('autoTranslate');
        if(autoTranslate.checked && tFile != null && tFile.length > 0) {
            progress.textContent = "Waiting for translations to load"
            loadDnt = true;
        }
        else {
            dntReader.loadDntFromServerFile(location + '/' + file, updateProgress, refreshTable);
        }
    }

    if(tFile != null && tFile.length > 0) {
        dnTranslations.loadDefaultFile(
            location + '/' + tFile,
            function(msg) {
              tprogress.textContent = msg;
            },
            function() {
              if(loadDnt) {
                dntReader.loadDntFromServerFile(location + '/' + file, updateProgress, refreshTable);
              }
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
  
  function refreshTable() {
    
    progress.textContent = "Refreshing";
    

    var numCols = dntReader.numColumns;
    var columnDefs = [];
    var tLookup = dntView.getTranslateLookup();
    
    
    function translationGetter(params) {
        return dnTranslations.translate(params.data[params.colDef.field]);
    }
    function floatGetter(params) {
        // four decimals, then strip trailing zeros
        var rounded = params.data[params.colDef.field].toFixed(4);
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
        
        columnDefs[c] = {
            headerName: dntReader.columnNames[c], 
            field: dntReader.columnNames[c], 
            width: 140, 
            filter: filter, 
            valueGetter : valueGetter};
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

    // var itemLimit = document.getElementById("itemLimit");
    // outputDataHtml(0, itemLimit.value);
    
    progress.textContent = "Loaded";
  }
  
  function outputDataHtml(start, end) {

    var data = dntView.getView(start, end);
    
    var numRows = data.length;
    var firstRow = data[0];
    var numCols = firstRow.length;
    var resultHtml = '<h2>' + dntReader.fileName  + ' <small>' + dntReader.numRows + ' rows in total</small> ';
    
    var itemLimit = document.getElementById("itemLimit");
    var prevNum = parseInt(start)-parseInt(itemLimit.value);
    if(prevNum < 0) {
        prevNum = 0;
    }
    var nextNum = parseInt(start)+parseInt(itemLimit.value);
    if(data.length < itemLimit.value) {
        nextNum = parseInt(start);
    }
    
    resultHtml += '<button class="btn" onclick="outputDataHtml(' + prevNum + ',' + itemLimit.value + ')">&lt; Previous Page</button>';
    resultHtml += ' <button class="btn" onclick="outputDataHtml(' + nextNum + ',' + itemLimit.value + ')">Next Page &gt;</button>';

    resultHtml += '</h2><div class="table-responsive"><table class="table">';
    
    var numDataDone = 0;
    
    var pivotDataBox = document.getElementById('pivotData');
    if(pivotDataBox != null && pivotDataBox.checked) {
        
        resultHtml += '<tr>';
        
        for(var c=0;c<numCols;++c) {
            resultHtml += '<th>' + firstRow[c] + '</th>';
        }
        
        for(var r=1;r<numRows;++r) {
            
          resultHtml += '<tr>'
        
          var row = data[r];
          for(var c=0;c<numCols;++c) {
          
            resultHtml += '<td>';
            resultHtml += row[c];
            resultHtml += '</td>';
          }
          resultHtml += '</tr>';
        }
    }
    else {

        for(var c=0;c<numCols;++c) {
            resultHtml += '<tr>';
            resultHtml += '<th>' + firstRow[c] + '</th>';
            
            for(var r=1;r<numRows;++r) {
            
                var row = data[r];
                
                resultHtml += '<td>';
                resultHtml += row[c];
                resultHtml += '</td>';
            }
            resultHtml += '</tr>';
        }
    }
    resultHtml += '</table></div>';
    
    var loadResults = document.getElementById('load_results');
    loadResults.innerHTML = resultHtml;
  }
  
  function testTranslate() {
    console.log('about to translate');
    var id = document.getElementById("testTranslateInput");
    console.log('using id ' + id.value);
    tprogress.textContent = dnTranslations.translate(id.value);
  }
  
  function getInput(name, index, existinginputs) {
      var value = "";
      if(existinginputs != null && index < existinginputs.length) {
          value = existinginputs[index].value;
      }
      return '<input id="' + name + index + '" class="form-control" value="' + value + '" type="text" />';
  }
  
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
  
  function addFRow() {
    var inputs = dntView.getNumberedInputs('filterColumn');
    var numT = inputs.length;
    
    var html = "";
    var tBoxes = document.getElementById('fcolumns');
    for(var i=0;i<numT;i++) {
        html += getInput('filterColumn', i, inputs);
    }
    html += getInput('filterColumn', numT, null);
    tBoxes.innerHTML = html;
    
    
    inputs = dntView.getNumberedInputs('filterValue');
    numT = inputs.length;
    html = "";
    tBoxes = document.getElementById('fvalues');
    for(var i=0;i<numT;i++) {
        html += getInput('filterValue', i, inputs);
    }
    html += getInput('filterValue', numT, null);
    tBoxes.innerHTML = html;
  }
