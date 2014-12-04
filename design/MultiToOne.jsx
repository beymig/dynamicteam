// JavaScript Document
//Set up vairaibles

var RectPiece = function(filename){
  this.load = function(filename){
    var doc = app.activeDocument;
    var pi = doc.placedItems.add();
    $.writeln(filename);
    pi.file = File(filename);
    this.pi=pi;
    this.x = pi.controlBounds[0];
    this.y = pi.controlBounds[1];
    this.width = pi.width;
    this.height = pi.height;
  };

  this.move_to = function(point){
    $.writeln("controlBounds:"+this.pi.controlBounds)
    this.pi.translate(point[0]-this.pi.controlBounds[0], point[1]-this.pi.controlBounds[1])
    this.x = this.pi.controlBounds[0];
    this.y = this.pi.controlBounds[1];
    this.width = this.pi.width;
    this.height = this.pi.height;
    $.writeln("After controlBounds:"+this.pi.controlBounds)
  };

  this.inside = function(point){
    return (point[0]>this.x && point[0]<this.x+this.width) 
      &&(point[1]>this.y && point[1]<this.y+this.height);
  };

  this.over_lap = function(rect){
    if (
        ((rect[0]-this.x)*(rect[0]-(this.x+this.width))>=0)
        &&((rect[2]-this.x)*(rect[2]-(this.x+this.width))>=0)
        &&((rect[0]-this.x)*(rect[2]-(this.x+this.width))!=0))
        return false;
    if (
        ((rect[1]-this.y)*(rect[1]-(this.y-this.height))>=0)
        &&((rect[3]-this.y)*(rect[3]-(this.y-this.height))>=0)
        &&((rect[1]-this.y)*(rect[3]-(this.y-this.height)))!=0)
        return false;
     return true;
  };

  this.load(filename);
}

var PrintBoard = function(artboard){
  $.writeln(artboard.artboardRect);
  this.width = artboard.artboardRect[2];
  this.insert_points = [];
  this.insert_points.push([1, 1]);
  this.pieces = [];
  this.insert = function(piece)
  {
    var wh = [piece.width, piece.height];
    for(var i=0; i<this.insert_points.length; i++)
    {
      if (this.test(this.insert_points[i], wh))
      {
        this.place_piece(i, piece);
        break;
      }
    }
  };

  this.test = function(point, wh)
  {
    var rect = [point[0], point[1], point[0]+wh[0], point[1]-wh[1]];
    if (rect[2]>this.width)
      return false;
    for(var i=0; i<this.pieces.length; i++)
    {
      if(this.pieces[i].over_lap(rect))
        return false;
    }
    return true;
  };

  this.place_piece = function(i, piece)
  {
    var point = this.insert_points[i];
    piece.move_to(point);
    this.pieces.push(piece);
    this.insert_points.splice (i, 1);
    this.insert_points.push([piece.x+piece.width, piece.y]);
    this.insert_points.push([piece.x, piece.y-piece.height]);
    this.insert_points.sort(function(a, b)
      {
        return -(a[1]-b[1])|| (a[0] - b[0]);
      });
  };
}

// Select the source folder.
sourceFolder = Folder.selectDialog('Select the folder with Illustrator files that you want to mere into one', '~');

// If a valid folder is selected
if (sourceFolder != null) {
  //files = new Array();
  // Get all files matching the pattern
  files = sourceFolder.getFiles(/\.(ai|eps|pdf)$/i);

  if (files.length > 0) {
    // Get the destination to save the files
    var pb = new PrintBoard(app.activeDocument.artboards[0]);
    for (i = 0; i < files.length; i++) {
      var piece = new RectPiece(files[i]);
      pb.insert(piece);
      //break;
    }
  }
  else {
    alert('No matching files found');
  }
}

