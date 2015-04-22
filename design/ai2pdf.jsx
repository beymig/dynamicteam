#include "util.jsx"
#include "abs_adjuster.jsx"
#include "label_gen.jsx"

(function (){
  function Exporter(doc, setting){
    //this.setting = setting;
    var rtValues = {};
    var exportInfo = {
      fabricInfo:[],
      sizeInfo:{},
      blankInfo:{},
    };
    //setting.log, units
    function exportPieces(count, number){
      var artboards = doc.artboards;
      for (var i = 0; i < artboards.length; i++ ) {
        var artboardName = artboards[i].name;
        if (~artboardName.indexOf(" blank"))
          continue;

        // Process this artbarod if we're exporting only a single one (layers mode) or if it doesn't have generic name or minus
        var fileid = [rtValues.size, artboardName, rtValues.log].join("_");
        if (number)
          fileid+= "_"+number;
      
        var base_filename = rtValues.outDir + "/" + fileid;
        var qty_delim = number?' ':'_';
        var first_file_name = base_filename + '.pdf';
        if (count > 1)
          first_file_name = base_filename + qty_delim+'1.pdf';

        var destFile = Util.exportArtboard(first_file_name, doc, i);
                
        if ( destFile ){
          for(var x=2; x<=count; x++)
            destFile.copy(base_filename + qty_delim + x +'.pdf')
        }       
      }
    }

    function replaceTextFrames(search, replace_text){
      var text_frames = doc.textFrames;  
      if (text_frames.length > 0)  
      {  
        for (var i = 0 ; i < text_frames.length; i++)  
        {  
          var this_text_frame = text_frames[i];  
          var new_string = this_text_frame.contents.replace(search, replace_text);  
          if (new_string != this_text_frame.contents)  
          {  
            this_text_frame.contents = new_string;  
          }  
        }  
      }  
    }

    function getPlaceHolders(phText){
      var phs = [];
      var text_frames = doc.textFrames;  
      for (var i = 0 ; i < text_frames.length; i++){  
        if ( text_frames[i].contents == phText){
          phs[phs.length] = text_frames[i];
        }
      }
      return phs;
    }

    function exportPiecesBySize(count, ph, numbers){
      replaceTextFrames(/^8888$/g, setting.log);
      if (ph && numbers.length){
        var phs = getPlaceHolders(ph);
        for( var i = 0; i < numbers.length; i++)
        {
          // change number
          for (var j = 0; j<phs.length; j++){
            phs[j].contents = numbers[i];
          }
          exportPieces(count, numbers[i]);
        }
        for (var j = 0; j<phs.length; j++){
          phs[j].contents = ph;
        }
      } else {
        exportPieces(count);
      }
    }
    function SaveExportInfo(outDir, exportInfo){
      var infoFile = new File(outDir+"/exportinfo.json");
      infoFile.open("w");
      infoFile.write(JSON.stringify(exportInfo, null, 2));
      infoFile.close();
    }

    this.run = function(){
      var absAdjuster = new ArtboardsAdjuster(doc);
      rtValues.log = setting.log;

      // change artboard name and get fabric infomation
      var artboards = doc.artboards;
      var fabricInfo = exportInfo.fabricInfo;
      var blankArtboards = [];
      for (var i = 0; i < artboards.length; i++ ) {
        var artboardName = artboards[i].name;
        var bIndex = artboardName.indexOf(" blank");
        if (bIndex != -1){
          //record blank infomation
          var blankid = artboardName.substr(0, bIndex);
          blankArtboards[blankArtboards.length]=blankid;
          //artboards[i].remove();
          //artboards[i].name = "_";
          continue;
        }
        artboards[i].name = artboardName.replace(/^FLAT_/g, "FLAT").replace(/^_|_+$/g, "");

        var fabric = artboards[i].name.split("_")[0];
        if (!~fabricInfo.indexOf(fabric))
          fabricInfo.push(fabric);
      }

      with(setting){
        var expreqs = setting.sizeList;
        var unitsCount = 0;
        var sizeInfo = exportInfo.sizeInfo;

        // update count
        for (var i=0; i<expreqs.length; i++){
          var expreq = expreqs[i];
          var size=expreq[0].split("_")[0], copyCount=expreq[1], numbers=expreq[2];

          var count = copyCount*(numbers&&numbers.length||1);
          unitsCount += count;
          if ( size in sizeInfo)
            sizeInfo[size] += count;
          else
            sizeInfo[size] = count;
        }

        var blankInfo = exportInfo.blankInfo;
        for (var size in sizeInfo){
          if (size == "keys")
            continue;
          size = size.split("_")[0];
          for (var i=0; i<blankArtboards.length; i++){
            var blankid=[size, blankArtboards[i]].join("_");
            blankInfo[blankid] = sizeInfo[size];
          }
        }

        // create dest folder
        var outDir = new Folder([setting.outDir, [setting.log, setting.sheetType, unitsCount, fabricInfo.length+"FABRICS"].join("_")].join("/"));
        if ( ! outDir.exists ){
          outDir.create();
        }
        rtValues.outDir = outDir;
      

        for (var i=0; i<expreqs.length; i++){
          var expreq = expreqs[i];
          var size=expreq[0], copyCount=expreq[1], numbers=expreq[2];

          // switch to size adn fit artboard
          Util.switchDataset(doc, size);
          absAdjuster.run();
          rtValues.size = size.split("_")[0];

          //export
          exportPiecesBySize(copyCount, setting.ph, numbers);
        }
        // export blank info
        SaveExportInfo(rtValues.outDir, exportInfo);
      }
    };
  }

  function ExportDlg(doc){
    var dlgRes = 
      "dialog { alignChildren:'fill', text:'Export to Pdf',\
        globalSetting: Panel{ orientation:'column', alignChildren:'left', text:'Global Setting',\
          dir: Group{orientation:'row', alignChildren:'left',\
            s: StaticText{ text:'Output Directory:'},\
            e: EditText{characters:50},\
            b: Button{ text:'Choose ...'}\
          },\
          sheetType: Group{orientation:'row', alignChildren:'left',\
            s: StaticText{ text:'Sheet Type:'},\
            rRoll: RadioButton{text:'Roll', value:true},\
            rSheetS: RadioButton{text:'SheetS'}\
            rSheetL: RadioButton{text:'SheetL'}\
          },\
          numberPH: Group{orientation:'row', alignChildren:'left',\
            s: StaticText{ text:'Number PlaceHolder:'},\
            e: EditText{ characters:3 },\
          }\
        },\
        sizeSetting: Panel{ orientation:'column', alignChildren:'left', text:'Size Setting',\
          gCount: Group{orientation:'row', alignChildren:'left',\
            s: StaticText{ text:'Copy Count:'},\
            e: EditText{characters:3},\
          },\
          gNumbers: Group{orientation:'row', alignChildren:'left',\
            s: StaticText{ text:'Create Size:'},\
            dSize: DropDownList{},\
            sNumbers: StaticText{ text:'#:'},\
            eList: EditText{characters:30},\
            bAdd: Button{text:'Add'},\
          },\
          gSizeList: Group{orientation:'row', alignChildren:'left',\
            s: StaticText{ text:'Create Size:'},\
            sizeList:ListBox{size:[370, 100],properties:{\
              numberOfColumns:3,\
              showHeaders:true,\
              columnTitles:['Size','Count','#s'],\
            }},\
          },\
        },\
        gButtons: Group{orientation:'row', alignChildren:'centre',\
          bExport: Button{ text:'Export'},\
          bCancel: Button{ text:'Cancel'},\
        },\
      }";

    function buildSizeList(expDlg){
      var sizelist = [];
      with(expDlg.sizeSetting.gSizeList){
        var sizeitems = sizeList.items;
        for (var i = 0; i<sizeitems.length; i++){
          sizelist[i] = [sizeitems[i].text, sizeitems[i].subItems[0].text, sizeitems[i].subItems[1].text.split(",")];
        }
      }
      return sizelist;
    }

    function initializeDlg(expDlg, doc){
      with(expDlg.globalSetting){
        dir.e.text = doc.fullName.path;
        dir.b.onClick = function() { dir.e.text = Folder.selectDialog(); };
        numberPH.e.text = "55";
      }
      with(expDlg.sizeSetting){
        for (var i=0; i<doc.dataSets.length; i++){
          gNumbers.dSize.add('item', doc.dataSets[i].name);
        }
        gCount.e.text = "1";
        gNumbers.bAdd.onClick = function(){
          var size = gNumbers.dSize.selection.text;
          // insert
          var item = gSizeList.sizeList.add('item', size);
          item.subItems[0].text = gCount.e.text;
          item.subItems[1].text = gNumbers.eList.text;
        };
      }
      with(expDlg.gButtons){
        bExport.onClick = function(){
          var setting = {};
          setting.log = doc.name.split('_')[0];

          with(expDlg.globalSetting){
            setting.outDir = dir.e.text
            setting.ph = numberPH.e.text;
            if (sheetType.rSheetS.value){
              setting.sheetType = "S";
            }else if (sheetType.rSheetL.value){
              setting.sheetType = "L";
            }else{
              setting.sheetType = "R";
            }
          }

          setting.sizeList = buildSizeList(expDlg);
          var exporter = new Exporter(doc, setting);
          exporter.run();
          if (expDlg.globalSetting.sheetType.rRoll.value){
            GenerateLabels(setting.log);
          }
          this.window.close(0);
        };
        bCancel.onClick = function(){this.window.close(0);};
      }
    }

    this.dlg = new Window(dlgRes);
    initializeDlg(this.dlg, doc);
    this.dlg.show();
  };

  var exportDlg = new ExportDlg(app.activeDocument);
})();
