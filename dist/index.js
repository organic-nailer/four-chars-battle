"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const bot_sdk_1 = require("@line/bot-sdk");
const game_manager_1 = require("./game_manager");
const reply_manager_1 = require("./reply_manager");
const score_storage_1 = require("./score_storage");
const clientConfig = {
    channelAccessToken: process.env.CHANNEL_ACCESS_TOKEN || '',
    channelSecret: process.env.CHANNEL_SECRET,
};
const middlewareConfig = {
    channelAccessToken: process.env.CHANNEL_ACCESS_TOKEN,
    channelSecret: process.env.CHANNEL_SECRET || '',
};
const PORT = process.env.PORT || 3000;
// Create a new LINE SDK client.
const client = new bot_sdk_1.Client(clientConfig);
const app = (0, express_1.default)();
app.set('view engine', 'ejs');
app.use(express_1.default.urlencoded({ extended: true }));
const gameManager = new game_manager_1.GameManager();
const scoreStorage = new score_storage_1.ScoreStorage();
const debugUsers = new Set();
var GameState;
(function (GameState) {
    GameState[GameState["InGame"] = 0] = "InGame";
    GameState[GameState["NotInGame"] = 1] = "NotInGame";
})(GameState || (GameState = {}));
function getGameState(userId) {
    if (lineGameMap.has(userId)) {
        return GameState.InGame;
    }
    return GameState.NotInGame;
}
// app.get('/', (req, res) => {
//     res.render('views', {
//         field: gameManager.idiom2String(
//             gameData.idioms,
//             gameData.collapsedHeight,
//             '<br/>'
//         ),
//         status: gameData.status,
//     });
// });
// app.post('/', (req, res) => {
//     const idiom = req.body['battle'];
//     const offset =
//         gameData.idioms.length == 0
//             ? 0
//             : gameManager.calcOffset(gameData.idioms[0].idiom, idiom) +
//               gameData.idioms[0].offset;
//     gameData.idioms.unshift({ idiom: idiom, offset: offset });
//     updateStatus();
//     res.redirect('/');
// });
// app.post('/restart', (req, res) => {
//     gameData.idioms.splice(0);
//     updateStatus();
//     res.redirect('/');
// });
function createShareLink(score) {
    return ('https://twitter.com/intent/tweet' +
        `?text=%E5%9B%9B%E5%AD%97%E7%86%9F%E8%AA%9E%E3%82%92${score}m` +
        '%E7%A9%8D%E3%81%BF%E4%B8%8A%E3%81%92%E3%81%BE%E3%81%97%E3%81' +
        '%9F%EF%BC%81%0A%23%E5%9B%9B%E5%AD%97%E7%86%9F%E8%AA%9E%E3%82' +
        '%BF%E3%83%AF%E3%83%BC%E3%83%90%E3%83%88%E3%83%AB%0A%23%E7%9F' +
        '%A2%E4%B8%8A%E7%A5%AD%20%23kcs_web%0Ahttps%3A%2F%2Flin.ee%2FLgKV1sj');
}
// This route is used for the Webhook.
app.post('/webhook', (0, bot_sdk_1.middleware)(middlewareConfig), async (req, res) => {
    const events = req.body.events;
    // Process all of the received events asynchronously.
    const results = await Promise.all(events.map(async (event) => {
        try {
            await textEventHandler(event);
        }
        catch (err) {
            if (err instanceof Error) {
                console.error(err);
            }
            // Return an error message.
            return res.status(500).json({
                status: 'error',
            });
        }
    }));
    // Return a successfull message.
    return res.status(200).json({
        status: 'success',
        results,
    });
});
const lineGameMap = new Map();
const textEventHandler = async (event) => {
    // Process all variables here.
    if (event.type !== 'message' || event.message.type !== 'text') {
        return;
    }
    // Process all message related variables here.
    const { replyToken } = event;
    const { text } = event.message;
    const { userId } = event.source;
    if (!userId) {
        await client.replyMessage(replyToken, {
            type: 'text',
            text: 'ゲームできないかも！',
        });
        return;
    }
    // デバッグ時の設定
    if (text === `${process.env.DEBUG_PASSWORD}=true;`) {
        if (!debugUsers.has(userId)) {
            debugUsers.add(userId);
            await client.replyMessage(replyToken, {
                type: 'text',
                text: 'debug mode on',
            });
        }
        return;
    }
    if (text === `${process.env.DEBUG_PASSWORD}=false;`) {
        if (debugUsers.has(userId)) {
            debugUsers.delete(userId);
            await client.replyMessage(replyToken, {
                type: 'text',
                text: 'debug mode off',
            });
        }
        return;
    }
    const reply = getGameState(userId) == GameState.NotInGame
        ? reply_manager_1.ReplyManager.getRepliesNotInGame()
        : reply_manager_1.ReplyManager.getRepliesInGame(gameManager.getRandomIdioms(5, null, false));
    if (text === '成績を見る') {
        const score = await scoreStorage.getUserScore(userId);
        await client.replyMessage(replyToken, {
            type: 'text',
            text: score ? `最高高さ:${score}m` : '成績がまだないよ',
            quickReply: reply,
        });
        return;
    }
    if (text === 'ランキング') {
        const max = 10;
        const scores = await scoreStorage.getScores();
        if (scores.length === 0) {
            await client.replyMessage(replyToken, {
                type: 'text',
                text: '記録がありません',
                quickReply: reply,
            });
            return;
        }
        const myScoreIndex = scores.findIndex((s) => s.user_id === userId);
        const nowStr = new Date().toLocaleString();
        const topScores = scores.slice(0, max).map((s, i) => {
            return {
                score: s.high_score,
                rank: i + 1,
                date: s.updated_at,
                emphasis: false,
            };
        });
        if (myScoreIndex >= 0 && myScoreIndex >= max) {
            topScores.pop();
            topScores.push({
                score: scores[myScoreIndex].high_score,
                rank: myScoreIndex + 1,
                date: scores[myScoreIndex].updated_at,
                emphasis: true,
            });
        }
        else if (myScoreIndex >= 0) {
            topScores[myScoreIndex].emphasis = true;
        }
        await client.replyMessage(replyToken, {
            type: 'flex',
            altText: 'ランキング',
            contents: {
                type: 'bubble',
                header: {
                    type: 'box',
                    layout: 'vertical',
                    contents: [
                        {
                            type: 'text',
                            text: `ランキング(${nowStr})`,
                        },
                    ],
                },
                body: {
                    type: 'box',
                    layout: 'vertical',
                    contents: topScores.map((score) => {
                        return {
                            type: 'text',
                            text: `${score.rank}. ${score.score}m (${score.date})`,
                            weight: score.emphasis ? 'bold' : 'regular',
                        };
                    }),
                },
            },
        });
        return;
    }
    if (text === '説明を見る') {
        await client.replyMessage(replyToken, {
            type: 'text',
            text: '四字熟語をなるべく高く積み上げよう！\n' +
                '前後の画数の差によって積み上がる位置が変わります\n' +
                'バランスがとれなくなったら終了！',
            quickReply: reply,
        });
        return;
    }
    if (text === '遊び方') {
        await client.replyMessage(replyToken, {
            type: 'text',
            text: '四字熟語をなるべく高く積み上げよう！\n' +
                '前後の画数の差によって積み上がる位置が変わります\n' +
                'バランスがとれなくなったら終了！\n\n' +
                '1.「はじめる」でゲームスタート\n' +
                '2.四字熟語を打ち込むと積まれるよ\n' +
                '　なるべく画数の近い四字熟語を選ぼう\n' +
                '3.積み方に無理がでると崩れて終了\n\n' +
                '詳しくは↓\n' +
                'https://pizzxa.fastriver.dev/apps/%E5%9B%9B%E5%AD%97%E7%86%9F%E8%AA%9E%E3%82%BF%E3%83%AF%E3%83%BC%E3%83%90%E3%83%88%E3%83%AB#h.jluxvpyoe4f9',
            quickReply: reply,
        });
        return;
    }
    if (text === 'アルゴリズム') {
        await client.replyMessage(replyToken, {
            type: 'text',
            text: '差分=追加する四字熟語-下の四字熟語\n' +
                '方向=符号(差分)が+ならば右、-ならば左\n' +
                '差分の絶対値=abs(差分)\n' +
                '差分の絶対値<=2ならばずらさない\n' +
                '差分の絶対値<=10ならば方向に1ずらして積む\n' +
                '差分の絶対値<=20ならば方向に2ずらして積む\n' +
                '方向に3ずらして積む\n',
            quickReply: reply,
        });
        return;
    }
    // Check if the user is in the game.
    if (getGameState(userId) === GameState.NotInGame) {
        if (text === 'はじめる') {
            const debug = debugUsers.has(userId);
            lineGameMap.set(userId, {
                idioms: [],
                status: '問題なし',
                debug: debug,
            });
            await client.replyMessage(replyToken, {
                type: 'text',
                text: 'ゲームをはじめます',
                quickReply: reply_manager_1.ReplyManager.getRepliesInGame(gameManager.getRandomIdioms(5, null, debug)),
            });
        }
        else {
            await client.replyMessage(replyToken, {
                type: 'text',
                text: '「はじめる」と言ってね',
                quickReply: reply_manager_1.ReplyManager.getRepliesNotInGame(),
            });
        }
        return;
    }
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const data = lineGameMap.get(userId);
    const topIdiomStrokes = data.idioms.length > 0
        ? gameManager.getDetail(data.idioms[0].idiom).weight
        : null;
    if (text === 'やめる') {
        await scoreStorage.saveScore(userId, data.idioms.length);
        lineGameMap.delete(userId);
        await client.replyMessage(replyToken, [
            {
                type: 'text',
                text: `ゲームをやめます\n記録:${data.idioms.length}`,
            },
            {
                type: 'text',
                text: `共有する↓\n${createShareLink(data.idioms.length)}`,
                quickReply: reply_manager_1.ReplyManager.getRepliesNotInGame(),
            },
        ]);
        return;
    }
    if (text === 'やりなおす') {
        await scoreStorage.saveScore(userId, data.idioms.length);
        lineGameMap.set(userId, {
            idioms: [],
            status: '問題なし',
            debug: false,
        });
        await client.replyMessage(replyToken, {
            type: 'text',
            text: `やりなおします\n記録:${data.idioms.length}`,
            quickReply: reply_manager_1.ReplyManager.getRepliesInGame(gameManager.getRandomIdioms(5, null, data.debug)),
        });
        return;
    }
    // 四字熟語じゃない場合の返答
    if (!gameManager.isIdiom(text)) {
        await client.replyMessage(replyToken, {
            type: 'text',
            text: 'ちょっとそれわかんない！ごめんね青春！',
            quickReply: reply_manager_1.ReplyManager.getRepliesInGame(gameManager.getRandomIdioms(5, topIdiomStrokes, data.debug)),
        });
        return;
    }
    // すでに使用した四字熟語の場合
    if (data.idioms.some((i) => i.idiom === text)) {
        await client.replyMessage(replyToken, {
            type: 'text',
            text: `${text}はもう出たもん！やり直し！`,
            quickReply: reply_manager_1.ReplyManager.getRepliesInGame(gameManager.getRandomIdioms(5, topIdiomStrokes, data.debug)),
        });
        return;
    }
    const offset = data.idioms.length == 0
        ? 0
        : gameManager.calcOffset(data.idioms[0].idiom, text) +
            data.idioms[0].offset;
    data.idioms.unshift({ idiom: text, offset: offset });
    const stability = gameManager.checkStability(data.idioms);
    if (stability === true) {
        await client.replyMessage(replyToken, {
            type: 'text',
            text: gameManager.idiom2String(data.idioms, null, '\n', data.debug),
            quickReply: reply_manager_1.ReplyManager.getRepliesInGame(gameManager.getRandomIdioms(5, gameManager.getDetail(text).weight, data.debug)),
        });
        return;
    }
    else {
        await scoreStorage.saveScore(userId, data.idioms.length);
        lineGameMap.delete(userId);
        await client.replyMessage(replyToken, [
            {
                type: 'text',
                text: gameManager.idiom2String(data.idioms, stability, '\n', data.debug),
            },
            {
                type: 'text',
                text: `崩れました...\n記録: ${data.idioms.length}m`,
            },
            {
                type: 'text',
                text: `共有する↓\n${createShareLink(data.idioms.length)}`,
            },
            {
                type: 'text',
                text: `参考:\n${gameManager.createCauseOfDefeat(data.idioms, '\n')}`,
                quickReply: reply_manager_1.ReplyManager.getRepliesNotInGame(),
            },
        ]);
        return;
    }
};
app.listen(PORT, () => {
    console.log('Example app listening on port 3000!');
});
//# sourceMappingURL=index.js.map