import express, { Application, Request, Response } from 'express';
import { ClientConfig, Client, middleware, MiddlewareConfig, WebhookEvent, TextMessage, MessageAPIResponseBase } from '@line/bot-sdk';
import { GameManager, DisplayIdiomData } from "./game_manager";
import { ReplyManager } from "./reply_manager";
import { ScoreStorage } from './score_storage';

const clientConfig: ClientConfig = {
	channelAccessToken: process.env.CHANNEL_ACCESS_TOKEN || '',
	channelSecret: process.env.CHANNEL_SECRET,
};

const middlewareConfig: MiddlewareConfig = {
	channelAccessToken: process.env.CHANNEL_ACCESS_TOKEN,
	channelSecret: process.env.CHANNEL_SECRET || '',
};

const PORT = process.env.PORT || 3000;

// Create a new LINE SDK client.
const client = new Client(clientConfig);

const app = express();
app.set("view engine", "ejs");
app.use(express.urlencoded({ extended: true }));

const gameManager = new GameManager();
const scoreStorage = new ScoreStorage();

interface GameData {
	idioms: DisplayIdiomData[],
	status: String,
	collapsedHeight: number | null,
}

const gameData: GameData = {
	idioms: [],
	status: "問題なし",
	collapsedHeight: null,
};

function updateStatus() {
	const stability = gameManager.checkStability(gameData.idioms);
	if(stability === true) {
		gameData.collapsedHeight = null;
		gameData.status = "問題なし";
	}
	else {
		gameData.collapsedHeight = stability;
		gameData.status = "崩れました";
	}
}

enum GameState {
	InGame, NotInGame,
};

function getGameState(userId: string): GameState {
	if(lineGameMap.has(userId)) {
		return GameState.InGame;
	}
	return GameState.NotInGame;
}

app.get("/", (req, res) => {
	res.render("views", {
		field: gameManager.idiom2String(gameData.idioms, gameData.collapsedHeight, "<br/>"),
		status: gameData.status,
	});
});

app.post("/", (req, res) => {
	const idiom = req.body["battle"];
	const offset = gameData.idioms.length == 0 ? 0 : gameManager.calcOffset(gameData.idioms[0].idiom, idiom) + gameData.idioms[0].offset;
	gameData.idioms.unshift({idiom:idiom, offset: offset});
	updateStatus();
	res.redirect("/");
});

app.post("/restart", (req, res) => {
	gameData.idioms.splice(0);
	updateStatus();
	res.redirect("/");
	});

// This route is used for the Webhook.
app.post(
	'/webhook',
	middleware(middlewareConfig),
	async (req, res): Promise<Response> => {
		const events: WebhookEvent[] = req.body.events;

		// Process all of the received events asynchronously.
		const results = await Promise.all(
			events.map(async (event: WebhookEvent) => {
				try {
					await textEventHandler(event);
				} catch (err: unknown) {
					if (err instanceof Error) {
						console.error(err);
					}

					// Return an error message.
					return res.status(500).json({
						status: 'error',
					});
				}
			})
		);

		// Return a successfull message.
		return res.status(200).json({
			status: 'success',
			results,
		});
	}
);

const lineGameMap = new Map<string, GameData>();

const textEventHandler = async (event: WebhookEvent): Promise<MessageAPIResponseBase | undefined> => {
	// Process all variables here.
	if (event.type !== 'message' || event.message.type !== 'text') {
		return;
	}

	// Process all message related variables here.
	const { replyToken } = event;
	const { text } = event.message;
	const { userId } = event.source;

	if(!userId) {
		await client.replyMessage(replyToken, {
			type: 'text',
			text: 'ゲームできないかも！',
		});
		return;
	}

	const reply = getGameState(userId) == GameState.NotInGame 
		? ReplyManager.getRepliesNotInGame() 
		: ReplyManager.getRepliesInGame(gameManager.getRandomIdioms(5));
	if(text === "成績を見る") {
		const score = await scoreStorage.getUserScore(userId);
		await client.replyMessage(replyToken, {
			type: 'text',
			text: score ? `最高高さ:${score}m` : '成績がまだないよ',
			quickReply: reply
		});
		return;
	}
	if(text === "説明を見る") {
		await client.replyMessage(replyToken, {
			type: 'text',
			text: '四字熟語をなるべく高く積み上げよう！\n'
				+ '前後の画数の差によって積み上がる位置が変わります\n'
				+ 'バランスがとれなくなったら終了！',
			quickReply: reply
		});
		return;
	}
	if(text === "アルゴリズム") {
		await client.replyMessage(replyToken, {
			type: 'text',
			text: '差分=追加する四字熟語-下の四字熟語\n'
				+ '方向=符号(差分)が+ならば右、-ならば左\n'
				+ '差分の絶対値=abs(差分)\n'
				+ '差分の絶対値<=1ならばずらさない\n'
				+ '差分の絶対値<=5ならば方向に1ずらして積む\n'
				+ '差分の絶対値<=20ならば方向に2ずらして積む\n'
				+ '方向に3ずらして積む\n',
			quickReply: reply
		});
		return;
	}
	
	// Check if the user is in the game.
	if (getGameState(userId) === GameState.NotInGame) {
		if(text === "はじめる") {
			lineGameMap.set(userId, { idioms: [], status: "問題なし", collapsedHeight: null });
			await client.replyMessage(replyToken, {
				type: 'text',
				text: 'ゲームをはじめます',
				quickReply: ReplyManager.getRepliesInGame(gameManager.getRandomIdioms(5)),
			});
		}
		else {
			await client.replyMessage(replyToken, {
				type: 'text',
				text: '「はじめる」と言ってね',
				quickReply: ReplyManager.getRepliesNotInGame()
			});
		}
		return;
	}

	const data = lineGameMap.get(userId)!;

	if(text === "やめる") {
		await scoreStorage.saveScore(userId, data.idioms.length);
		lineGameMap.delete(userId);
		await client.replyMessage(replyToken, {
			type: 'text',
			text: 'ゲームをやめます\n記録:${data.idioms.length}',
			quickReply: ReplyManager.getRepliesNotInGame()
		});
		return;
	}
	if(text === "やりなおす") {
		await scoreStorage.saveScore(userId, data.idioms.length);
		lineGameMap.set(userId, { idioms: [], status: "問題なし", collapsedHeight: null });
		await client.replyMessage(replyToken, {
			type: 'text',
			text: `やりなおします\n記録:${data.idioms.length}`,
			quickReply: ReplyManager.getRepliesInGame(gameManager.getRandomIdioms(5)),
		});
		return;
	}

	// 四字熟語じゃない場合の返答
	if(!gameManager.isIdiom(text)) {
		await client.replyMessage(replyToken, {
			type: 'text',
			text: 'ちょっとそれわかんない！ごめんね青春！',
			quickReply: ReplyManager.getRepliesInGame(gameManager.getRandomIdioms(5)),
		});
		return;
	}

	// すでに使用した四字熟語の場合
	if(data.idioms.some(i => i.idiom === text)) {
		await client.replyMessage(replyToken, {
			type: 'text',
			text: `${text}はもう出たもん！やり直し！`,
			quickReply: ReplyManager.getRepliesInGame(gameManager.getRandomIdioms(5)),
		});
		return;
	}

	const offset = data.idioms.length == 0 ? 0 : gameManager.calcOffset(data.idioms[0].idiom, text) + data.idioms[0].offset;
	data.idioms.unshift({ idiom: text, offset: offset });
	const stability = gameManager.checkStability(data.idioms);

	if(stability === true) {
		await client.replyMessage(replyToken, {
			type: 'text',
			text: gameManager.idiom2String(data.idioms, null, "\n"),
			quickReply: ReplyManager.getRepliesInGame(gameManager.getRandomIdioms(5)),
		});
		return;
	}
	else {
		await scoreStorage.saveScore(userId, data.idioms.length);
		lineGameMap.delete(userId);
		await client.replyMessage(replyToken, [{
			type: 'text',
			text: gameManager.idiom2String(data.idioms, stability, "\n"),
		},
		{
			type: 'text',
			text: `崩れました...\n記録: ${data.idioms.length}m`,
			quickReply: ReplyManager.getRepliesNotInGame()
		}]);
		return;
	}
};

app.listen(PORT, () => {
	console.log("Example app listening on port 3000!");
});
