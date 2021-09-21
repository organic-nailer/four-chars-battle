import pool from './db_pool';

export class ScoreStorage {
    async getScores(): Promise<Score[]> {
        const client = await pool.connect();
        const result = await client.query(
            'SELECT * FROM UserData ORDER BY high_score DESC'
        );
        client.release();
        return result.rows;
    }

    async saveScore(userId: string, score: number): Promise<void> {
        const client = await pool.connect();
        const result = await client.query<Score>(
            'SELECT high_score FROM UserData WHERE user_id=$1',
            [userId]
        );
        const highScore =
            result.rows.length === 0 ? 0 : result.rows[0].high_score;
        if (score > highScore) {
            const nowStr = new Date().toISOString();
            await client.query(
                'INSERT INTO UserData(user_id, high_score, updated_at)' +
                    ' VALUES($1, $2, $3)' +
                    ' ON CONFLICT(user_id)' +
                    ' DO UPDATE SET high_score=$2, updated_at=$3',
                [userId, score, nowStr]
            );
        }
        client.release();
    }

    async getUserScore(userId: string): Promise<number | null> {
        const client = await pool.connect();
        const result = await client.query<Score>(
            'SELECT high_score FROM UserData WHERE user_id=$1',
            [userId]
        );
        client.release();
        if (result.rows.length === 0) return null;
        return result.rows[0].high_score;
    }
}

export interface Score {
    user_id: string;
    high_score: number;
    updated_at: string;
}
