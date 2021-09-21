"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ScoreStorage = void 0;
const db_pool_1 = __importDefault(require("./db_pool"));
class ScoreStorage {
    async getScores() {
        const client = await db_pool_1.default.connect();
        const result = await client.query('SELECT * FROM UserData ORDER BY high_score DESC');
        client.release();
        return result.rows;
    }
    async saveScore(userId, score) {
        const client = await db_pool_1.default.connect();
        const result = await client.query('SELECT high_score FROM UserData WHERE user_id=$1', [userId]);
        const highScore = result.rows.length === 0 ? 0 : result.rows[0].high_score;
        if (score > highScore) {
            const nowStr = new Date().toISOString();
            await client.query('INSERT INTO UserData(user_id, high_score, updated_at)' +
                ' VALUES($1, $2, $3)' +
                ' ON CONFLICT(user_id)' +
                ' DO UPDATE SET high_score=$2, updated_at=$3', [userId, score, nowStr]);
        }
        client.release();
    }
    async getUserScore(userId) {
        const client = await db_pool_1.default.connect();
        const result = await client.query('SELECT high_score FROM UserData WHERE user_id=$1', [userId]);
        client.release();
        if (result.rows.length === 0)
            return null;
        return result.rows[0].high_score;
    }
}
exports.ScoreStorage = ScoreStorage;
//# sourceMappingURL=score_storage.js.map