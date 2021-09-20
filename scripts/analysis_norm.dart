import 'dart:convert';
import 'dart:io';
import 'dart:math' as math;

import 'process_kanji.dart';

void main(List<String> args) async {
  final File idiomsFile = File("./data/idioms.txt");
  final List<String> idioms = idiomsFile.readAsLinesSync();
  final StrokeCalculator strokeCalculator = StrokeCalculator();
  await strokeCalculator.init();
  final result = List.filled(150, 0);
  for (int i = 0; i < idioms.length; i++) {
    print("calc: $i");
    for (int j = 0; j < i; j++) {
      if (i != j) {
        final distance = strokeCalculator.calcDistance(idioms[i], idioms[j]);
        result[distance]++;
      }
    }
  }
  final File outputFile = File("./data/analysis.txt");
  final outputSink = outputFile.openWrite();
  for (int i = 0; i < result.length; i++) {
    outputSink.writeln("$i, ${result[i]}");
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

  int calcDistance(String idiom1, String idiom2) {
    assert(idiom1.length == idiom2.length);
    int sum = 0;
    for (int i = 0; i < idiom1.length; i++) {
      sum += math
          .pow(
              calculateStrokeCount(idiom1[i]) - calculateStrokeCount(idiom2[i]),
              2)
          .toInt();
    }
    return math.sqrt(sum).toInt();
  }
}
