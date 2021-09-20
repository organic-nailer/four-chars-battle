void main(List<String> args) {
  final point = "U+5DDD";
  print("川".codeUnitAt(0));
  print("川".codeUnits);
  print(unicode2CodeUnits(point));
  print(compareArrays(unicode2CodeUnits(point), "川".codeUnits));
  print(codeUnits2int32(unicode2CodeUnits(point)));
  print(codeUnits2int32("川".codeUnits));
  print("𡿫".codeUnitAt(0));
  print("𡿫".codeUnits);
  print(int.parse("U+21FEB".substring(2), radix: 16));
  print(unicode2CodeUnits("U+21FEB"));
  print(compareArrays(unicode2CodeUnits("U+21FEB"), "𡿫".codeUnits));
  print(codeUnits2int32(unicode2CodeUnits("U+21FEB")));
  print(codeUnits2int32("𡿫".codeUnits));
  print("こんにちは"[1].codeUnits);
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

bool compareArrays(List<int> a, List<int> b) {
  if (a.length != b.length) return false;
  for (var i = 0; i < a.length; i++) {
    if (a[i] != b[i]) return false;
  }
  return true;
}
