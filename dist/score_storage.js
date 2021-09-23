"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ScoreStorage = void 0;
const moment_1 = __importDefault(require("moment"));
const db_pool_1 = __importDefault(require("./db_pool"));
class ScoreStorage {
    async getScores() {
        const client = await db_pool_1.default.connect();
        const result = await client.query('SELECT * FROM UserData2 ORDER BY high_score DESC');
        client.release();
        return result.rows.map((row) => {
            return {
                user_id: row.user_id,
                high_score: row.high_score,
                updated_at: (0, moment_1.default)(row.updated_at).format('MM/DD hh:mm'),
            };
        });
    }
    async saveScore(userId, score) {
        const client = await db_pool_1.default.connect();
        const result = await client.query('SELECT high_score FROM UserData2 WHERE user_id=$1', [userId]);
        const highScore = result.rows.length === 0 ? 0 : result.rows[0].high_score;
        if (score > highScore) {
            const nowStr = (0, moment_1.default)().toISOString();
            await client.query('INSERT INTO UserData2(user_id, high_score, updated_at)' +
                ' VALUES($1, $2, $3)' +
                ' ON CONFLICT(user_id)' +
                ' DO UPDATE SET high_score=$2, updated_at=$3', [userId, score, nowStr]);
        }
        client.release();
    }
    async getUserScore(userId) {
        const client = await db_pool_1.default.connect();
        const result = await client.query('SELECT high_score FROM UserData2 WHERE user_id=$1', [userId]);
        client.release();
        if (result.rows.length === 0)
            return null;
        return result.rows[0].high_score;
    }
}
exports.ScoreStorage = ScoreStorage;
//# sourceMappingURL=score_storage.js.map