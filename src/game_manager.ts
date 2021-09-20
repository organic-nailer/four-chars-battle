import * as fs from 'fs'

export class GameManager {

	private idiomMap: Map<String, IdiomDetail> = new Map();

	constructor(altIdioms: String | null = null) {
		if(altIdioms !== null) {
			this.setIdioms(altIdioms);
			return;
		}
		fs.readFile('./data/processed_idioms.txt', 'utf8', (err, data) => {
			if (err) throw err;
			this.setIdioms(data);
			console.log("finished GameManager init");
		});
	}

	private setIdioms(idioms: String): void {
		idioms.split("\n").forEach((line) => {
			const [idiom, weight, center] = line.split(",");
			this.idiomMap.set(idiom, {centerOfGravity: parseFloat(center), weight: parseInt(weight)});
		});
	}

	isIdiom(text: String): boolean {
		return this.idiomMap.has(text);
	}

	checkStability(idioms :DisplayIdiomData[]): number | true {
		if(idioms.length <= 1) return true;
		let index = 0;
		let currentInfo: IdiomDetail = {centerOfGravity: 0, weight: 0};
		while(index < idioms.length) {
			const offset = index + 1 < idioms.length ? idioms[index].offset - idioms[index + 1].offset : idioms[index].offset;
			currentInfo = this.mergeDetail(currentInfo, this.getDetail(idioms[index].idiom), offset);
			console.log(`0-${index} center is ${currentInfo.centerOfGravity}, ${currentInfo.weight} : offset is ${offset}`);
			if(!this.checkStableOffsetting(currentInfo.centerOfGravity, offset)) return index;
			index++;
		}
		return true;
	}

	private checkStableOffsetting(center: number, offset: number): boolean {
		if(offset === 0) return true;
		if(offset < 0) return center >= -offset - 2;
		return center <= -offset + 2;
	}

	private mergeDetail(base: IdiomDetail, above: IdiomDetail, offset: number): IdiomDetail {
		const weight = base.weight + above.weight;
		return { 
			centerOfGravity: (base.centerOfGravity * base.weight + (above.centerOfGravity + offset) * above.weight) / weight, 
			weight: weight 
		};
	}

	private getDetail(idiom: String): IdiomDetail {
		return this.idiomMap.get(idiom) ?? { centerOfGravity: 0, weight: 0 };
	}

	idiom2String(idioms: DisplayIdiomData[], collapsedHeight: number | null, divider: string): string {
	    const offsetMax = idioms.reduce((acc, cur) => Math.max(acc, cur.offset), 0);
	    const offsetMin = idioms.reduce((acc, cur) => Math.min(acc, cur.offset), 0);
	    const strList = idioms.map((idiom) => {
			// const detail = this.getDetail(idiom.idiom);
		    // return `${this.spaces(idiom.offset - offsetMin)}${idiom.idiom}(${detail.centerOfGravity},${detail.weight})${this.spaces(offsetMax - idiom.offset)}`;
			return `${this.spaces(idiom.offset - offsetMin)}${idiom.idiom}${this.spaces(offsetMax - idiom.offset)}`;
 	    });
		 if(collapsedHeight !== null) {
			 strList.splice(collapsedHeight+1, 0, Array(-offsetMin+offsetMax+4).fill("ー").join(""));
		 }
		 return `${Array(-offsetMin).fill("＿").join("")}${idioms.length}m${Array(offsetMax).fill("＿").join("")}` + divider + strList.join(divider);
    }

    private spaces(n: number): String {
	    return Array(n).fill("　").join("");
    }

	calcOffset(base: String, above: String): number {
		const baseDetail = this.getDetail(base);
		const aboveDetail = this.getDetail(above);
		const diff = aboveDetail.weight - baseDetail.weight;
		const diffAbs = Math.abs(diff);
		const diffIsPositive = diff > 0;
		if(diffAbs <= 1) return 0;
		if(diffAbs <= 5) return diffIsPositive ? 1 : -1;
		if(diffAbs <= 20) return diffIsPositive ? 2 : -2;
		return diffIsPositive ? 3 : -3;
	}

	getRandomIdioms(num: number): string[] {
		const idiomList = Array.from(this.idiomMap.keys());
		const result = new Array(num);
		for(let i = 0; i < num; i++) {
			result[i] = idiomList[Math.floor(Math.random() * idiomList.length)];
		}
		return result;
	}
}

interface IdiomDetail {
	centerOfGravity: number;
	weight: number;
};

export interface DisplayIdiomData {
	idiom: String,
	offset: number,
};
