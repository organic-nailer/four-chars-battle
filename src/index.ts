import express, { Application, Request, Response } from 'express';
import { ClientConfig, Client, middleware, MiddlewareConfig, WebhookEvent, TextMessage, MessageAPIResponseBase } from '@line/bot-sdk';
import { GameManager, DisplayIdiomData } from "./game_manager";

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

	if(text === "成績を見る") {
		await client.replyMessage(replyToken, {
			type: 'text',
			text: '成績をいい感じに返す',
		});
		return;
	}
	if(text === "説明を見る") {
		await client.replyMessage(replyToken, {
			type: 'text',
			text: '説明をいい感じに返す',
		});
		return;
	}
	if(text === "アルゴリズム") {
		await client.replyMessage(replyToken, {
			type: 'text',
			text: 'アルゴリズムをいい感じに返す',
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
			});
		}
		else {
			await client.replyMessage(replyToken, {
				type: 'text',
				text: '「はじめる」と言ってね',
			});
		}
		return;
	}

	if(text === "やめる") {
		lineGameMap.delete(userId);
		await client.replyMessage(replyToken, {
			type: 'text',
			text: 'ゲームをやめます',
		});
		return;
	}
	if(text === "やりなおす") {
		lineGameMap.set(userId, { idioms: [], status: "問題なし", collapsedHeight: null });
		await client.replyMessage(replyToken, {
			type: 'text',
			text: 'やりなおします',
		});
		return;
	}

	// 四字熟語じゃない場合の返答
	if(!gameManager.isIdiom(text)) {
		await client.replyMessage(replyToken, {
			type: 'text',
			text: 'ちょっとそれわかんない！ごめんね青春！',
		});
		return;
	}

	const data = lineGameMap.get(userId)!;

	// すでに使用した四字熟語の場合
	if(data.idioms.some(i => i.idiom === text)) {
		await client.replyMessage(replyToken, {
			type: 'text',
			text: `${text}はもう出たもん！`,
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
		});
		return;
	}
	else {
		await client.replyMessage(replyToken, {
			type: 'text',
			text: gameManager.idiom2String(data.idioms, null, "\n"),
		});
		await client.replyMessage(replyToken, {
			type: 'text',
			text: '崩れました...',
		});
		lineGameMap.delete(userId);
		return;
	}
};

app.listen(PORT, () => {
	console.log("Example app listening on port 3000!");
});
