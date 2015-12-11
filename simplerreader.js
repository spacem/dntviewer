function SimplerReader(pFile, littleEndian) {
    this.pos = 4;
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
      
      var retVal = "";
      for(var c=0;c<len;++c) {
        retVal += String.fromCharCode(this.readByte());
      }
      
      return retVal;
    }
  }