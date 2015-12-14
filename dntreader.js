function DntReader() {
// module for to allow reading of dnt data from dnt files
// right now this simply loads the whole file into the data property
// data is an array of objects eg [{id: "123",NameParam: "456"}]
  
  this.data = [];
  this.columnNames = [];
  this.columnTypes = [];
  this.numRows = 0;
  this.numColumns = 0;
  this.fileName = "";
  
  // function to populate the object with the data in the dnt file
  this.processFile = function(arrayBuffer, fileName) {
    
    this.fileName = fileName;
    this.data = [];
    this.columnNames = [];
    this.columnTypes = [];
    
    // not sure if littleEndian should always be true or when it would be false
    var reader = new SimplerReader(arrayBuffer, 4, true);
    this.numColumns = reader.readUint16() + 1;
    this.numRows = reader.readUint32();
    
    this.columnNames[0] = 'id';
    this.columnTypes[0] = 3;
    for(var c=1;c<this.numColumns;++c) {
      this.columnNames[c] = reader.readString().substr(1);
      this.columnTypes[c] = reader.readByte();
    }
    
    for(var r=0;r<this.numRows;++r) {
      
      var id = reader.readUint32();
      this.data[r] = [];
      this.data[r]["id"] = id;
      
      for(var c=1;c<this.numColumns;++c) {
      
        if(this.columnTypes[c] == 1) {
          this.data[r][this.columnNames[c]] = reader.readString();
        }
        else if(this.columnTypes[c] == 2) {
          // bool
          this.data[r][this.columnNames[c]] = reader.readInt32();
        }
        if(this.columnTypes[c] == 3) {
          // int
          this.data[r][this.columnNames[c]] = reader.readInt32();
        }
        else if(this.columnTypes[c] == 4) {
          // float
          this.data[r][this.columnNames[c]] = reader.readFloat32();
        }
        if(this.columnTypes[c] == 5) {
          // double
          this.data[r][this.columnNames[c]] = reader.readFloat32();
        }
      }
    }
  }
  
  // function to load in dnt data from a hosted file
  // if the file is not found it will try a zip with the same name
  this.loadDntFromServerFile = function(fileName, statusFunc, processFileFunc, failFunc) {
    
    console.log("about to load");
    
    var xhr = new XMLHttpRequest();
    xhr.open('GET', fileName, true);
    xhr.responseType = 'blob';
    
    statusFunc('downloading dnt file ' + fileName);
    
    var t = this;
    
    xhr.onload = function(e) {
      console.log("got status");
      
      if (this.status == 200) {
        console.log("got 200 status");
        
        var blobv = this.response;
        if(fileName.toUpperCase().lastIndexOf(".DNT") == fileName.length-4) {
          console.log("dnt file");
          
          var fileReader = new FileReader();
          fileReader.onload = function(e) {
            t.processFile(e.target.result, fileName);
            processFileFunc();
          };
          fileReader.readAsArrayBuffer(blobv);
        }
        else {
          console.log("zip maybe");
          statusFunc('unziping compressed dnt file');
          
          console.log(blobv);
          
          unzipBlob(blobv, function(unZippedData) {
            
            statusFunc('loading dnt');
            console.log("unzipped: " + unZippedData.length + " bytes");
            
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
          console.log('what status:' + this.status);
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