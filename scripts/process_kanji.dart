import 'dart:async';
import 'dart:convert';
import 'dart:io';

void main(List<String> args) async {
  final useKanjis = await getUseKanjis();
  print('useKanjis: ${useKanjis.length}');
  final File file = File('./data/mji.00601.csv');
  final stream =
      file.openRead().transform(utf8.decoder).transform(LineSplitter()).skip(1);
  //int count = 0;
  StreamSubscription? subscription;

  final Map<int, int> kanjiMap = <int, int>{};

  subscription = stream.listen((line) {
    //if (count++ > 3) subscription?.cancel();
    final rows = line.split(',');
    if (rows.length < 4 || rows[3].isEmpty || rows[27].isEmpty) return;
    final utf16Point = codeUnits2int32(unicode2CodeUnits(rows[3]));
    // print("${rows[0]}, $utf16Point, ${rows[3]}");
    if (useKanjis.contains(utf16Point)) {
      kanjiMap[utf16Point] = int.parse(rows[27]);
    }
  });

  subscription.onDone(() {
    print('done');
    print(kanjiMap.length);
    if (kanjiMap.length != useKanjis.length) {
      print('not all kanji are found');
      useKanjis.forEach((int codePoint) {
        if (!kanjiMap.containsKey(codePoint)) {
          print('$codePoint was not found');
        }
      });
    }
    final File outputFile = File("./data/out.txt");
    final outputSink = outputFile.openWrite();
    kanjiMap.forEach((key, value) {
      outputSink.write("${String.fromCharCode(key)},$key,$value\n");
    });
    outputSink.close();
  });
}

Future<Set<int>> getUseKanjis() async {
  final File file = File("./data/idioms.txt");
  final stream =
      file.openRead().transform(utf8.decoder).transform(LineSplitter());
  final result = <int>{};
  await for (final line in stream) {
    for (int i = 0; i < line.length; i++) {
      result.add(codeUnits2int32(line[i].codeUnits));
    }
  }
  return result;
}

List<int> unicode2CodeUnits(String str) {
  final hexCode = int.parse(str.substring(2), radix: 16);
  if (hexCode < 0x10000) return [hexCode];
  final high = (hexCode - 0x10000) >> 10;
  final low = hexCode - 0x10000 - (high << 10);
  return [0xD800 + high, 0xDC00 + low];
}

int codeUnits2int32(List<int> codeUnits) {
  if (codeUnits.length == 1) return codeUnits[0];
  return codeUnits[0] << 16 | codeUnits[1];
}
