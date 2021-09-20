import 'dart:convert';
import 'dart:io';

import 'process_kanji.dart';

void main(List<String> args) async {
  final File idiomsFile = File("./data/idioms.txt");
  final List<String> idioms = idiomsFile.readAsLinesSync();
  final StrokeCalculator strokeCalculator = StrokeCalculator();
  await strokeCalculator.init();
  final result = List.filled(200, 0);
  final strokes =
      idioms.map((idiom) => strokeCalculator.calcStrokes(idiom)).toList();
  for (int i = 0; i < strokes.length; i++) {
    print("calc: $i");
    for (int j = 0; j < strokes.length; j++) {
      if (i != j) {
        final distance = strokes[i] - strokes[j];
        result[distance + 100]++;
      }
    }
  }
  final File outputFile = File("./data/analysis_all_strokes.txt");
  final outputSink = outputFile.openWrite();
  for (int i = 0; i < result.length; i++) {
    outputSink.writeln("${i - 100}, ${result[i]}");
  }
  outputSink.close();
}

class StrokeCalculator {
  Map<int, int> _strokeCounts = {};
  Future<void> init() async {
    final File kanjisFile = File("./data/out.txt");
    final kanjiStream =
        kanjisFile.openRead().transform(utf8.decoder).transform(LineSplitter());
    await for (String line in kanjiStream) {
      final data = line.split(",");
      _strokeCounts[int.parse(data[1])] = int.parse(data[2]);
    }
  }

  int calculateStrokeCount(String kanji) {
    final point = codeUnits2int32(kanji[0].codeUnits);
    return _strokeCounts[point] ?? -1;
  }

  int calcStrokes(String idiom) {
    int sum = 0;
    for (int i = 0; i < idiom.length; i++) {
      sum += calculateStrokeCount(idiom[i]);
    }
    return sum;
  }
}
