function DntReader() {
// module for to allow reading of dnt data from dnt files
// right now this simply loads the whole file into the data property
// data is an array of objects eg [{id: "123",NameParam: "456"}]
  
  this.data = [];
  this.columnNames = [];
  this.columnTypes = [];
  this.columnIndexes = [];
  this.numRows = 0;
  this.numColumns = 0;
  this.fileName = "";
  this.colsToLoad = null;
  
  // function to populate the object with the data in the dnt file
  this.processFile = function(arrayBuffer, fileName) {
    
    var start = new Date().getTime();
    
    this.fileName = fileName;
    
    // not sure if littleEndian should always be true or when it would be false
    var reader = new SimplerReader(arrayBuffer, 4, true);
    
    var readFuncs = [];
    readFuncs[1] = function(reader) { return reader.readString() };
    readFuncs[2] = function(reader) { return reader.readInt32() };
    readFuncs[3] = function(reader) { return reader.readInt32() };
    readFuncs[4] = function(reader) { return reader.readFloat32() };
    readFuncs[5] = function(reader) { return reader.readFloat32() };
    
    var skipFuncs = [];
    skipFuncs[1] = function(reader) { reader.skipString() };
    skipFuncs[2] = function(reader) { reader.skipInt32() };
    skipFuncs[3] = function(reader) { reader.skipInt32() };
    skipFuncs[4] = function(reader) { reader.skipFloat32() };
    skipFuncs[5] = function(reader) { reader.skipFloat32() };
    
    this.numColumns = reader.readUint16() + 1;
    this.numRows = reader.readUint32();
    
    this.data = new Array(this.numRows);
    this.columnNames = new Array(this.numColumns);
    this.columnTypes = new Array(this.numColumns);
    
    this.columnNames[0] = 'id';
    this.columnTypes[0] = 3;
    var colReaders = [];
    var colIsRead = [];
    var numRemovedColumns = 0;
    for(var c=1;c<this.numColumns;++c) {
      this.columnNames[c] = reader.readString().substr(1);
      this.columnTypes[c] = reader.readByte();
      
      if(this.colsToLoad == null || this.colsToLoad[this.columnNames[c]]) {
        colIsRead[c] = true;
        colReaders[c] = readFuncs[this.columnTypes[c]];
      }
      else {
        colIsRead[c] = false;
        colReaders[c] = skipFuncs[this.columnTypes[c]];
      }
    }
    
    for(var r=0;r<this.numRows;++r) {
      
      this.data[r] = [];
      this.data[r][0] = reader.readUint32();
      
      var colIndex = 1;
      for(var c=1;c<this.numColumns;++c) {
        if(colIsRead[c]) {
          this.data[r][colIndex] = colReaders[c](reader);
          colIndex++;
        }
        else {
          colReaders[c](reader);
        }
      }
    }
    
    if(this.colsToLoad != null) {

      var newColumnNames = ['id'];
      var newColumnTypes = [3];
      
      for(var c=1;c<this.numColumns;++c) {
        if(this.colsToLoad[this.columnNames[c]]) {
          newColumnNames.push(this.columnNames[c]);
          newColumnTypes.push(this.columnTypes[c]);
        }
      }
      
      this.numColumns = newColumnNames.length;
      this.columnNames = newColumnNames;
      this.columnTypes = newColumnTypes;
    }
    
    this.columnIndexes = {'id': 0};
    for(var c=1;c<this.numColumns;++c) {
      this.columnIndexes[this.columnNames[c]] = c;
    }

    var end = new Date().getTime();
    var time = end - start;
    console.log('dnt process time: ' + time/1000 + 's for ' + fileName);
  }
  
  this.getRow = function(index) {
    return this.convertData(this.data[index]);
  }
  
  this.convertData = function(d) {
    var item = {id: d[0]};

    for(var c=1;c<this.numColumns;++c) {
      item[this.columnNames[c]] = d[c];
    }
    
    return item;
  }
  
  this.getValue = function(index, colName) {
    if(colName in this.columnIndexes) {
      return this.data[index][this.columnIndexes[colName]];
    }
    else {
      return null;
    }
  }
  
  // function to load in dnt data from a hosted file
  // if the file is not found it will try a zip with the same name
  this.loadDntFromServerFile = function(fileName, statusFunc, processFileFunc, failFunc) {
    
    // console.log("about to load");
    
    var xhr = new XMLHttpRequest();
    xhr.open('GET', fileName, true);
    xhr.responseType = 'blob';
    
    statusFunc('downloading dnt file ' + fileName);
    
    var t = this;
    
    xhr.onload = function(e) {
      // console.log("got status");
      
      if (this.status == 200) {
        // console.log("got 200 status");
        
        var blobv = this.response;
        if(fileName.toUpperCase().lastIndexOf(".DNT") == fileName.length-4) {
          // console.log("dnt file");
          
          var fileReader = new FileReader();
          fileReader.onload = function(e) {
            t.processFile(e.target.result, fileName);
            processFileFunc();
          };
          fileReader.readAsArrayBuffer(blobv);
        }
        else {
          // console.log("zip maybe");
          statusFunc('unziping compressed dnt file');
          
          // console.log(blobv);
          
          unzipBlob(blobv, function(unZippedData) {
            
            // statusFunc('loading dnt');
            //console.log("unzipped: " + unZippedData.length + " bytes");
            
            var fileReader = new FileReader();
            fileReader.onload = function(e) {
              t.processFile(e.target.result, fileName);
              processFileFunc(e.target.result, fileName);
            };
            fileReader.readAsArrayBuffer(unZippedData);
          });
        }
      }
      else {
        // if we get an error we can try to see if there is a zip version there
        if(fileName.toUpperCase().lastIndexOf('.DNT') == fileName.length-4) {
          var zipFileName = fileName.substr(0,fileName.length-4) + '.zip';
          t.loadDntFromServerFile(zipFileName, statusFunc, processFileFunc, failFunc);
        }
        else {
          console.log('what! status ' + this.status + '??');
          failFunc(this.status + ': Cannot load file, couldnt load zip either: ' + fileName);
        }
      }
    };
    
    xhr.send();
  }
  
  function unzipBlob(blob, callback) {
    // use a zip.BlobReader object to read zipped data stored into blob variable
    zip.createReader(new zip.BlobReader(blob), function(zipReader) {
      // get entries from the zip file
      zipReader.getEntries(function(entries) {
        // get data from the first file
        entries[0].getData(new zip.BlobWriter(), function(data) {
          // close the reader and calls callback function with uncompressed data as parameter
          zipReader.close();
          callback(data);
        });
      });
    }, onerror);
  }
  
  function onerror(message) {
    console.error(message);
  }
}