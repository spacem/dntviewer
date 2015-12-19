function FileUpload(
  dropZoneDivName,
  fileInputName,
  fileFormName,
  fileDetailDivName,
  progressDivName,
  processFunc,
  isBinary) {
// module used to handle dropping of files or browsing of files
  
  this.dropZoneDivName = dropZoneDivName;
  this.fileInputName = fileInputName;
  this.fileDetailDivName = fileDetailDivName;
  this.fileFormName = fileFormName;
  this.progressDivName = progressDivName;
  this.processFunc = processFunc;
  this.isBinary = isBinary;
  
  this.progress = null;
  
  this.init = function() {
    var t = this;
    
    var files = document.getElementById(this.fileInputName);
    files.addEventListener('change', function(evt) { t.handleFileSelect(evt) }, false);
    
    var dropZone = document.getElementById(this.dropZoneDivName);
    dropZone.addEventListener('dragover', function(evt) { t.handleDragOver(evt) }, false);
    dropZone.addEventListener('dragleave', function(evt) { t.handleDragLeave(evt) }, false);
    dropZone.addEventListener('drop', function(evt) { t.handleFileDrop(evt) }, false);
    
    this.progress = document.getElementById(this.progressDivName);
    if(this.progress == null) {
      console.log('cannot find progress bar ' + this.progressDivName);
    }
  }
  
  this.handleFileSelect = function(evt) {
    var files = evt.target.files;
    console.log('added ' + files.length);
    
    for(var i=0;i<files.length;++i) {
        this.loadFile(files[i]);
    }
    var fileForm = document.getElementById(this.fileFormName);
    fileForm.reset();
  }
  
  this.handleDragOver = function(evt) {
    evt.stopPropagation();
    evt.preventDefault();
    evt.dataTransfer.dropEffect = 'copy'; // Explicitly show this is a copy.
    
    evt.target.className = "bg-success";
  }
  
  this.handleDragLeave = function(evt) {
    evt.stopPropagation();
    evt.preventDefault();
    evt.dataTransfer.dropEffect = 'copy'; // Explicitly show this is a copy.
    
    evt.target.className = "bg-info";
  }
  
  this.handleFileDrop = function(evt) {
    evt.stopPropagation();
    evt.preventDefault();
    
    var files = evt.dataTransfer.files; // FileList object.
    
    if(files == null || files.length == 0) {
      evt.target.className = "bg-danger";
      this.progress.textContent = 'no file';
      return;
    }

    for(var i=0;i<files.length;++i) {
        this.loadFile(files[i]);
    }
  }
  
  this.loadFile = function(addedFile) {
    console.log('loading uploaded file ' + addedFile);
    
    var dropZone = document.getElementById(this.dropZoneDivName);
    
    if(addedFile == null) {
      dropZone.className = "bg-danger";
      this.progress.textContent = 'no file';
      return;
    }
    
    var fileName = addedFile.name;
    
    if(this.isBinary) {
      if(fileName.toUpperCase().lastIndexOf(".DNT") != fileName.length - 4) {
        dropZone.className = "bg-danger";
        this.progress.textContent = 'not a DNT file';
        return;
      }
    }
    else{
      if(fileName.toUpperCase().lastIndexOf(".XML") != fileName.length - 4) {
        this.progress.textContent = 'not an XML file';
        dropZone.className = "bg-danger";
        return;
      }
    }
    
    dropZone.className = "bg-info";
    
    var t = this;
    
    var reader = new FileReader();
    reader.onerror = this.errorHandler;
    reader.onabort = function(e) {
      alert('File read cancelled');
    };
    reader.onloadstart = function(e) {
      document.getElementById(progressDivName).textContent = 'loading';
    };
    reader.onload = function(e) {
      t.processFunc(e.target.result, addedFile.name);
    };
    
    if(this.isBinary) {
      reader.readAsArrayBuffer(addedFile);
    }
    else  {
      reader.readAsText(addedFile);
    }
  }

  function abortRead() {
  // reader.abort();
  }
  
  function errorHandler(evt) {
    switch(evt.target.error.code) {
      case evt.target.error.NOT_FOUND_ERR:
        alert('File Not Found!');
        break;
      case evt.target.error.NOT_READABLE_ERR:
        alert('File is not readable');
        break;
      case evt.target.error.ABORT_ERR:
        break; // noop
      default:
        alert('An error occurred reading this file.');
    };
  }
}