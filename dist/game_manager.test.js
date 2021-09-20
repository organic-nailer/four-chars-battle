"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const game_manager_1 = require("./game_manager");
const altIdioms = [
    "一心一徳,21,0.9286",
    "一将万骨,23,0.4565",
    "一笑千金,23,0.2826",
    "一種一瓶,27,0.3148",
    "一紙半銭,30,0.5667",
    "一士諤諤,36,0.8056",
    "一顧傾城,45,0.2111",
    "三三五五,12,0.0000",
    "一日千秋,17,0.6765",
    "一衣帯水,22,0.3182",
    "一念発起,28,0.5000",
    "完全無欠,29,-0.0517",
    "天変地異,30,0.3000",
    "天衣無縫,39,0.5769",
].join("\n");
const gameManager = new game_manager_1.GameManager(altIdioms);
test("四字熟語かどうか判定する", () => {
    expect(gameManager.isIdiom("焼肉定食")).toBeFalsy();
    expect(gameManager.isIdiom("一士諤諤")).toBeTruthy();
});
test("オフセットの計算", () => {
    expect(gameManager.calcOffset("一将万骨", "一笑千金")).toBe(0);
    expect(gameManager.calcOffset("一種一瓶", "一笑千金")).toBe(-1);
    expect(gameManager.calcOffset("一笑千金", "一種一瓶")).toBe(1);
    expect(gameManager.calcOffset("一士諤諤", "一種一瓶")).toBe(-2);
    expect(gameManager.calcOffset("一笑千金", "一士諤諤")).toBe(2);
    expect(gameManager.calcOffset("一顧傾城", "一心一徳")).toBe(-3);
    expect(gameManager.calcOffset("一心一徳", "一顧傾城")).toBe(3);
});
test("バランスが取れていない場合", () => {
    const idioms = [
        { idiom: "三三五五", offset: -6 },
        { idiom: "一日千秋", offset: -5 },
        { idiom: "一衣帯水", offset: -4 },
        { idiom: "一念発起", offset: -2 },
        { idiom: "完全無欠", offset: -2 },
        { idiom: "天変地異", offset: -2 },
        { idiom: "天衣無縫", offset: 0 },
    ];
    expect(gameManager.checkStability(idioms)).toBe(2);
});
//# sourceMappingURL=game_manager.test.js.map