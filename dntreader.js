function DntReader() {
// module for to allow reading of dnt data from dnt files
// right now this simply loads the whole file into the data property
// data is an array of objects eg [{id: "123",NameParam: "456"}]
'use strict';
  
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
    var colIndex = 1;
    var realNumCols = 0;
    
    for(var c=1;c<this.numColumns;++c) {
      var colName = reader.readString().substr(1);
      var colType = reader.readByte();
      
      if(this.colsToLoad === null || this.colsToLoad[colName]) {
        colIsRead[c] = true;
        colReaders[c] = readFuncs[colType];

        this.columnNames[colIndex] = colName;
        this.columnTypes[colIndex] = colType;
        colIndex++;
      }
      else {
        colIsRead[c] = false;
        colReaders[c] = skipFuncs[colType];
      }
    }
    realNumCols = colIndex;
    
    for(var r=0;r<this.numRows;++r) {
      
      this.data[r] = new Array(realNumCols);
      this.data[r][0] = reader.readUint32();
      
      colIndex = 1;
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
    
    this.numColumns = realNumCols;

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
      if(d[c] != null) {
        item[this.columnNames[c]] = d[c];
      }
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
    var useFileName = fileName;
    if(this.colsToLoad === null && fileName.toUpperCase().lastIndexOf(".LZJSON") != fileName.length-7) {
      useFileName = fileName.substr(0,fileName.length-4) + '.lzjson';
    }
    this.loadDntFromServerFileImpl(useFileName, statusFunc, processFileFunc, failFunc);
  }
  
  this.loadDntFromServerFileImpl = function(fileName, statusFunc, processFileFunc, failFunc) {
    
    // console.log("about to load");
    var isLzJson = (fileName.toUpperCase().lastIndexOf(".LZJSON") == fileName.length-7);
    
    var xhr = new XMLHttpRequest();
    xhr.open('GET', fileName, true);
    
    if(isLzJson) {
      xhr.responseType = 'text';
    }
    else {
      xhr.responseType = 'blob';
    }
    
    statusFunc('downloading dnt file ' + fileName);
    var start = new Date().getTime();
    
    var t = this;
    
    xhr.onerror = function(e) {
      console.log('what! error ', e);
      failFunc('Cannot load file' + e);
    }
    
    xhr.ontimeout = function(e) {
      console.log('what! timeout ', e);
      failFunc('Timeout loading file' + e);
    }
    
    xhr.onload = function(e) {
      // console.log("got status");
      
      if (this.status === 200) {
        // console.log("got 200 status");
        
        var blobv = this.response;
        if(fileName.toUpperCase().lastIndexOf(".DNT") === fileName.length-4) {
          // console.log("dnt file");
          
          var fileReader = new FileReader();
          fileReader.onload = function(e) {
            t.processFile(e.target.result, fileName);
            
            var end = new Date().getTime();
            var time = end - start;
            console.log('dnt time: ' + time/1000 + 's for ' + fileName);
            processFileFunc();
          };
          fileReader.readAsArrayBuffer(blobv);
        }
        else if(isLzJson) {
          t.processLzFile(blobv, fileName);
          
          var end = new Date().getTime();
          var time = end - start;
          console.log('lzjson time: ' + time/1000 + 's for ' + fileName);
          processFileFunc();
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
            
              var end = new Date().getTime();
              var time = end - start;
              console.log('zip time: ' + time/1000 + 's for ' + fileName);
              processFileFunc();
            };
            fileReader.readAsArrayBuffer(unZippedData);
          });
        }
      }
      else {
        // if we get an error we can try to see if there is a zip version there
        if(fileName.toUpperCase().lastIndexOf('.LZJSON') === fileName.length-7) {
          console.log('trying dnt');
          var dntFileName = fileName.substr(0,fileName.length-7) + '.dnt';
          t.loadDntFromServerFileImpl(dntFileName, statusFunc, processFileFunc, failFunc);
        }
        else if(fileName.toUpperCase().lastIndexOf('.DNT') === fileName.length-4) {
          console.log('trying zip');
          var zipFileName = fileName.substr(0,fileName.length-4) + '.zip';
          t.loadDntFromServerFileImpl(zipFileName, statusFunc, processFileFunc, failFunc);
        }
        else {
          console.log('what! status ' + this.status + '??');
          failFunc(this.status + ': Cannot load file, couldnt load zip either: ' + fileName);
        }
      }
    };
    
    xhr.send();
  }
  
  this.processLzFile = function(blobv, fileName) {
    var stringifiedData = LZString.decompressFromUTF16(blobv);

    var dlData = JSON.parse(stringifiedData);
    
    this.data = dlData.data;
    this.fileName = fileName;
    this.columnNames = dlData.columnNames;
    this.columnTypes = dlData.columnTypes;
    
    this.numRows = this.data.length;
    this.numColumns = dlData.columnNames.length;
    
    this.columnIndexes = {'id': 0};
    for(var c=1;c<this.numColumns;++c) {
      this.columnIndexes[this.columnNames[c]] = c;
    }
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