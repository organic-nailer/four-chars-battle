import 'dart:convert';
import 'dart:io';

import 'analysis_all_strokes.dart';

void main(List<String> args) async {
  final File idiomsFile = File("./data/idioms.txt");
  final List<String> idioms = idiomsFile.readAsLinesSync();
  final StrokeCalculator strokeCalculator = StrokeCalculator();
  await strokeCalculator.init();
  final List<IdiomData> result = [];
  for (String idiom in idioms) {
    final strokes = strokeCalculator.calcStrokes(idiom);
    final center = -1.5 * strokeCalculator.calculateStrokeCount(idiom[0]) -
        0.5 * strokeCalculator.calculateStrokeCount(idiom[1]) +
        0.5 * strokeCalculator.calculateStrokeCount(idiom[2]) +
        1.5 * strokeCalculator.calculateStrokeCount(idiom[3]);
    result.add(IdiomData(idiom, strokes, center / strokes));
  }

  final File outputFile = File("./data/processed_idioms.txt");
  final outputSink = outputFile.openWrite();
  for (int i = 0; i < result.length; i++) {
    outputSink.writeln(result[i].toCSV());
  }
  outputSink.close();
}

class IdiomData {
  final String idiom;
  final int strokes;
  final double center;
  const IdiomData(this.idiom, this.strokes, this.center);

  String toCSV() => "$idiom, $strokes, ${center.toStringAsFixed(4)}";
}
