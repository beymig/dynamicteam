
var OUTPUT_FOLDER = "R:\\NewTasks";
var CUT_OUTPUT_FOLDER = "N:\\";
var CUT_OUTPUT_FOLDER_MID = "r:\\READY_TO_CUT";
var COMBINING_PREFIX = "combining"
var COMBINED_PREFIX = "combined"
var DOT_FILE = "R:\\daniel_test\\dot.pdf";
var DOT_SIZE = 30;
var CUTCODE_TEXTFRAME;
var FABRIC_LIST = {
  "29089":["BASKETBALL", 60, 80],
  "28979":["BASKETBALL", 60, 80],
  "MESH28979":["BASKETBALL", 60, 80],
  "20365":["BASKETBALL", 60, 90],
  "29192":["BASKETBALL", 58, 90],
  "MESH29192":["BASKETBALL", 58, 90],
  "9851":["BASKETBALL", 62, 60],
  "9087":["BASKETBALL", 54, 60],
  "20324":["TRACK", 62, 80],
  "9052":["TRACK", 58, 60],
  "29084":["TRACK", 62, 60],
  "340880":["RACER KILT", 60, 50],
  "9017":["WRESTLING", 60, 90],
  "20337":["VOLLYBALL", 58, 60],
  "20316":["VOLLYBALL", 58, 60],
  "20439":["VOLLYBALL", 58, 60],
  "29121":["SOCCER", 62, 80],
  "MESH29121":["SOCCER", 62, 80],
  "28878":["SOCCER TRIM", 62, 70],
  "29209":["TRIM", 58, 50],
  "29127":["LACROSSE", 60, 90],
  "MESH29127":["LACROSSE", 60, 90],
  "29287":["LACROSSE", 54, 70],
  "29176":["LACROSSE", 54, 70],
  "1649 DYNA DRY":["DYNA-DRY", 60, 60],
  "2031 DYNA DRY":["DYNA-DRY", 60, 60],
  "AEROFIBER":["DYNAMIC", 62, 90],
  "DRY-TEC":["DYNAMIC", 60, 90],
  "DAZZLE":["DYNAMIC", 60, 90],
  "5235":["FLEX-DRY", 60, 90],
  "3650":["FLEX-DRY", 60, 90],
  "JL2013":["DYNAMIC", 58, 90],
  "9679-005":["DYNAMIC", 54, 90],
  "RICE-MESH":["DYNAMIC", 61, 90],
  "STRETCH TEC":["DYNAMIC", 64, 90],
  "791-PANTS":["HEAVY POLYESTER", 62, 90],
  "F791":["HEAVY POLYESTER", 62, 90],
  "298-JERSEY":["HEAVY POLYESTER", 60, 90],
  "5377 9.5 oz":["HEAVY WEIGHT", 63, 90],
  "AIR-MESH":["DYNAMIC", 60, 80],
  "DRY TEC":["DYNAMIC", 60, 80],
  "PORTHOLE MESH":["DYNAMIC", 54, 80],
  "HEAVY DAZZLE":["DYNAMIC", 60, 80],
  "POLY-FLEX":["DYNAMIC", 64, 90],
  "20365":["DYNAMIC", 61, 90],
  "1997":["NIKE", 54, 80],
  "1997-18":["NIKE", 54, 80],
  "1887":["NIKE", 55, 80],
  "5106":["NIKE", 62, 80],
};

var size_order = ["AXXXXLT", "AXXXLT","AXXLT", "AXLT", "ALT", "AMT", "AST", "AXXXXL", "AXXXL", "AXXL", "AXL", "AL", "AM", "AS", "AXS", "AXXS", "YXXL", "YXL", "YL", "YM", "YS"];


