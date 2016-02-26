function SimplerReader(pFile, startPos, littleEndian) {
// module to track position while reading binary data
'use strict';
  
  this.pos = startPos;
  this.file = new DataView(pFile);
  this.littleEndian = littleEndian;
  
  this.readUint16 = function() {
    this.pos += 2;
    return this.file.getUint16(this.pos-2, this.littleEndian);
  }
  
  this.readUint32 = function() {
    this.pos += 4;
    return this.file.getUint32(this.pos-4, this.littleEndian);
  }
  
  this.readInt32 = function() {
    this.pos += 4;
    return this.file.getInt32(this.pos-4, this.littleEndian);
  }
  
  this.readFloat32 = function() {
    this.pos += 4;
    return this.file.getFloat32(this.pos-4, this.littleEndian);
  }
  
  this.readByte = function() {
    this.pos += 1;
    return this.file.getUint8(this.pos-1, this.littleEndian);
  }
  
  this.readString = function() {
    var len = this.readUint16();
    if(len === 0) {
      return '';
    }
    else if(len === 1) {
      return String.fromCharCode(this.readByte());
    }
    else {
      
      // var retVal = '';
      var strings = new Array(len);
      for(var c=0;c<len;++c) {
        
        strings[c] = String.fromCharCode(this.readByte());
        // retVal += String.fromCharCode(this.readByte());
      }

      return strings.join('');
    }
  }
  
  this.skipUint16 = function() {
    this.pos += 2;
  }
  
  this.skipUint32 = function() {
    this.pos += 4;
  }
  
  this.skipInt32 = function() {
    this.pos += 4;
  }
  
  this.skipFloat32 = function() {
    this.pos += 4;
  }
  
  this.skipByte = function() {
    this.pos += 1;
  }
  
  this.skipString = function() {
    var len = this.readUint16();
    this.pos += len;
  }
}