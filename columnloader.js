var progress = null;

// helper classes for working with local files
var dntFileUpload = new FileUpload('drop_zone','files','fileForm','list','progress_bar',processFile, true);

var allLoadedData = {};
var maxResult = 8;

function clearCols() {
  allLoadedData = {};
  populateResults();
}

// function called by this when the file is ready to load
function processFile(data, fileName) {
  try
  {
    console.log('loading ' + fileName);
    var dntReader = new DntReader(); // loads the binary data
    dntReader.processFile(data, fileName);
    allLoadedData[fileName] = dntReader.columnNames;
    
    populateResults();
    
    progress.textContent = "Added " + dntReader.columnNames.length + "columns of " + fileName;
  }
  catch(ex) {
    console.log(ex);
    progress.textContent = "Load failed";
  }
}

function search() {
  var input = document.getElementById('searchText');
  
  var results = '';
  var foundResults = 0;
  
  if(input.value.length > 1) {
    for(var fileName in allLoadedData) {
      var cols = allLoadedData[fileName];
      var numCols = cols.length;
      
      var fileResults = '';
      for(var i=0;i<numCols&&foundResults<maxResult;++i) {
        if(cols[i].toUpperCase().indexOf(input.value.toUpperCase()) > -1) {
          fileResults += ' |&nbsp;' + cols[i];
        }
      }
      
      if(fileResults.length > 0) {
        results += 
        '<div class="col-xs-5"><a href=".' + 
        window.location.hash + 
        '&dnt=' + 
        fileName + 
        '">' + 
        fileName + 
        '</a></div><div class="col-xs-7">' + fileResults + '</div>';
          foundResults++;
      }
    }
  }
  
  if(foundResults > 8) {
    maxResult = foundResults;
  }
  else {
    maxResult = 8;
  }
  
  var resultsDiv = document.getElementById('searchresults');
  resultsDiv.innerHTML = results;
}

function more() {
  maxResult += 6;
  search();
}

function dntPageInit() {
  
  if (window.File && window.FileReader && window.FileList && window.Blob) {
    //do your stuff!
  } else {
    alert('The File APIs are not fully supported by your browser.');
  }
  
  progress = document.getElementById('progress_bar');
  dntFileUpload.init();
  clearCols();
  
  $.getJSON( "filecolumns.json", function( data ) {
    allLoadedData = data;
    populateResults();
  });
}

function populateResults() {
    var resultItem = document.getElementById('colresults');
    resultItem.value = JSON.stringify(allLoadedData, null, '\t');
    search();
}