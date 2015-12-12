function DnTranslations() {
    
    this.data = null;
    
  this.process = function(data, callback, complete) {
    this.data = {}
    var numItems = 0;

    console.log("processing:");
    var parser = new DOMParser();
    var xmlData = parser.parseFromString(data,"text/xml");
    var elements = xmlData.getElementsByTagName("message");
    
    // regex to remove korean translations
    //var regEx = new RegExp('[^\u0000-\u007F]+');
    var regEx = new RegExp('[^\x00-\x7F]+');
    
    for(var m=0;m<elements.length;++m) {
      var text = elements[m].textContent;
      if(!regEx.test(text))
      {
        var mid = elements[m].getAttribute("mid");
        this.data[mid] = text.substring(0,200);
        numItems++;
      }
    }
    
    try {
      sessionStorage.setItem('UIStrings', JSON.stringify(this.data));
      console.log('stored ui strings for later');
    }
    catch (ex) {
      console.log('error setting strings ' + ex);
      console.log(ex.stack);
    }
    
    callback('loaded ' + numItems + ' translations');
    complete();
  }


  this.loadDefaultFile = function(fileName, callback, complete) {
    
    console.log("about to load");
    
    try {
      this.data = JSON.parse(sessionStorage.getItem('UIStrings'));
      console.log('no error getting ui strings from local storage');
    }
    catch(ex) {
      console.log('couldnt get ui strings ' + ex);
      // no worries, just load the default
    }
    
    if(this.data != null && typeof this.data == 'object') {
      callback('using uistrings stored in session storage');
      complete();
      return;
    }
    else {
      console.log('data still not set');
      if(this.data == null) {
        console.log('data is null');
      }
    }
    
    window.URL = window.URL || window.webkitURL;  // Take care of vendor prefixes.
    
    var xhr = new XMLHttpRequest();
    xhr.open('GET', fileName, true);
    xhr.responseType = 'blob';
    
    callback('downloading translation file ' + fileName);
        
    var t = this;
    
    xhr.onload = function(e) {
      if (this.status == 200) {
        
        callback('unziping translations');
        console.log("reading zip");
        
        var blobv = this.response;
        console.log(blobv);
        
        unzipBlobToText(blobv, function(unZippedData) {

              console.log('got entry data');
              callback('loading xml');
              console.log("unzipped: " + unZippedData.length.toLocaleString() + " bytes");
              t.process(unZippedData, callback, complete);
            });
      }
      else {
          // if we get an error we can try to see if there is a zip version there
          if(fileName.toUpperCase().lastIndexOf('.XML') == fileName.length-4) {
            var zipFileName = fileName.substr(0,fileName.length-4) + '.zip';
            t.loadDefaultFile(zipFileName, callback, complete);
          }
          else {
            console.log('what status' + this.status);
            callback(this.status + ': Cannot load file, couldnt load zip either: ' + fileName);
          }
      }
    };
    
    xhr.send();
  }
  
  function unzipBlobToText(blob, callback) {
    // use a zip.BlobReader object to read zipped data stored into blob variable
    zip.createReader(new zip.BlobReader(blob), function(zipReader) {
      // get entries from the zip file
      zipReader.getEntries(function(entries) {
        // get data from the first file
        entries[0].getData(new zip.TextWriter("text/plain"), function(data) {
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
  
  this.translate = function(value) {
      if(this.data == null) {
        return value;
      }
      var result = "";
      
      if(value == 0 || value == "" || value == null) {
        result = value;
      }
      else if(value.toString().indexOf(',') > -1) {
        var values = value.toString().split(',');
        
        var results = []
        for(var v=0;v<values.length;++v) {
          var stripped = values[v].replace("{", "").replace("}", "");
          results.push(values[v].replace(stripped, this.translate(stripped)));
        }
        
        result = results.join(',');
      }
      else {
        result = this.data[value];
        if(typeof result === 'undefined' && typeof value === 'string') {
           if(value.indexOf('{') == 0) {
            var stripped = value.replace("{", "").replace("}", "");
            result = value.replace(stripped, this.translate(stripped));
          }
          else {
            result = value;
          }
        }
      }

      return result;
  }
}