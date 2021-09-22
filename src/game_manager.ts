import * as fs from 'fs';

export class GameManager {
    private idiomMap: Map<string, IdiomDetail> = new Map();

    // 辞書を読み込む
    constructor(altIdioms: string | null = null) {
        if (altIdioms !== null) {
            this.setIdioms(altIdioms);
            return;
        }
        fs.readFile('./data/processed_idioms.txt', 'utf8', (err, data) => {
            if (err) throw err;
            this.setIdioms(data);
            console.log('finished GameManager init');
        });
    }

    private setIdioms(idioms: string): void {
        idioms.split('\n').forEach((line) => {
            const [idiom, weight, center] = line.split(',');
            this.idiomMap.set(idiom, {
                centerOfGravity: parseFloat(center),
                weight: parseInt(weight),
            });
        });
    }

    /// [text]が既知の四字熟語であるかを判定する
    isIdiom(text: string): boolean {
        return this.idiomMap.has(text);
    }

    /// idiomsのタワーが安定であるかを判定する
    /// true の場合、タワーが安定している
    /// number の場合、上からnumber番目の高さで崩れる
    checkStability(idioms: DisplayIdiomData[]): number | true {
        if (idioms.length <= 1) return true;
        let index = 0;
        let currentInfo = this.getDetail(idioms[0].idiom);
        let currentOffset = 0;
        while (index < idioms.length - 1) {
            console.log(
                `0-${index} center is ${currentInfo.centerOfGravity}, ${currentInfo.weight} : offset is ${currentOffset}`
            );
            if (
                !this.checkStableOffsetting(
                    currentInfo.centerOfGravity,
                    currentOffset
                )
            ) {
                return index - 1;
            }
            currentOffset = idioms[index].offset - idioms[index + 1].offset;
            currentInfo = this.mergeDetail(
                currentInfo,
                this.getDetail(idioms[index].idiom),
                currentOffset
            );
            index++;
        }
        return true;
    }

    private checkStableOffsetting(center: number, offset: number): boolean {
        if (offset === 0) return true;
        if (offset < 0) return center >= -offset - 2;
        return center <= -offset + 2;
    }

    /// 崩れた原因を表示するための文字列を生成
    createCauseOfDefeat(idioms: DisplayIdiomData[], divider: string): string {
        const causeOfDefeat = idioms.map((idiom) => {
            const detail = this.getDetail(idiom.idiom);
            return `${idiom.idiom} - ${detail.weight}画`;
        });
        return causeOfDefeat.join(divider);
    }

    private mergeDetail(
        base: IdiomDetail,
        above: IdiomDetail,
        offset: number
    ): IdiomDetail {
        const weight = base.weight + above.weight;
        return {
            centerOfGravity:
                (base.centerOfGravity * base.weight +
                    (above.centerOfGravity + offset) * above.weight) /
                weight,
            weight: weight,
        };
    }

    getDetail(idiom: string): IdiomDetail {
        return this.idiomMap.get(idiom) ?? { centerOfGravity: 0, weight: 0 };
    }

    idiom2String(
        idioms: DisplayIdiomData[],
        collapsedHeight: number | null,
        divider: string,
        debug: boolean
    ): string {
        const offsetMax = idioms.reduce(
            (acc, cur) => Math.max(acc, cur.offset),
            0
        );
        const offsetMin = idioms.reduce(
            (acc, cur) => Math.min(acc, cur.offset),
            0
        );
        const strList = idioms.map((idiom) => {
            // const detail = this.getDetail(idiom.idiom);
            // return `${this.spaces(idiom.offset - offsetMin)}${idiom.idiom}(${detail.centerOfGravity},${detail.weight})${this.spaces(offsetMax - idiom.offset)}`;
            if (debug) {
                const detail = this.getDetail(idiom.idiom);
                return `${this.spaces(idiom.offset - offsetMin)}${
                    idiom.idiom
                }(${detail.weight},${detail.centerOfGravity.toFixed(2)})`;
            } else {
                return `${this.spaces(idiom.offset - offsetMin)}${
                    idiom.idiom
                }${this.spaces(offsetMax - idiom.offset)}`;
            }
        });
        if (collapsedHeight !== null) {
            strList.splice(
                collapsedHeight + 1,
                0,
                Array(-offsetMin + offsetMax + 4)
                    .fill('ー')
                    .join('')
            );
        }
        return (
            `${Array(-offsetMin).fill('＿').join('')}${idioms.length}m${Array(
                offsetMax
            )
                .fill('＿')
                .join('')}` +
            divider +
            strList.join(divider)
        );
    }

    private spaces(n: number): string {
        return Array(n).fill('　').join('');
    }

    calcOffset(base: string, above: string): number {
        const baseDetail = this.getDetail(base);
        const aboveDetail = this.getDetail(above);
        const diff = aboveDetail.weight - baseDetail.weight;
        const diffAbs = Math.abs(diff);
        const diffIsPositive = diff > 0;
        if (diffAbs <= 2) return 0;
        if (diffAbs <= 10) return diffIsPositive ? 1 : -1;
        if (diffAbs <= 20) return diffIsPositive ? 2 : -2;
        return diffIsPositive ? 3 : -3;
    }

    getRandomIdioms(
        num: number,
        weight: number | null = null,
        debug: boolean
    ): string[] {
        let idiomList = Array.from(this.idiomMap.entries());
        if (weight !== null) {
            idiomList = idiomList.filter(
                (value) => Math.abs(value[1].weight - weight) <= 15
            );
        }
        const result: string[] = new Array(num);
        for (let i = 0; i < num; i++) {
            if (debug) {
                const idiom =
                    idiomList[Math.floor(Math.random() * idiomList.length)];
                result[i] = `${idiom[0]}(${
                    idiom[1].weight
                },${idiom[1].centerOfGravity.toFixed(2)})`;
            } else {
                result[i] =
                    idiomList[Math.floor(Math.random() * idiomList.length)][0];
            }
        }
        return result;
    }
}

interface IdiomDetail {
    centerOfGravity: number;
    weight: number;
}

export interface DisplayIdiomData {
    idiom: string;
    offset: number;
}
