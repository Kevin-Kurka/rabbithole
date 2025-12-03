export interface Achievement {
    id: string;
    key: string;
    name: string;
    description: string;
    icon: string;
    category: string;
    points: number;
    criteria: any;
    createdAt: Date;
}

export interface UserAchievement {
    id: string;
    userId: string;
    achievementId: string;
    earnedAt: Date;
    progress: any;
    achievement?: Achievement;
}

export interface GamificationReputation {
    userId: string;
    totalPoints: number;
    evidencePoints: number;
    methodologyPoints: number;
    consensusPoints: number;
    collaborationPoints: number;
    level: number;
}

export interface LeaderboardEntry {
    user: {
        id: string;
        username: string;
        email: string;
        createdAt: Date;
    };
    totalPoints: number;
    evidencePoints: number;
    methodologyPoints: number;
    consensusPoints: number;
    collaborationPoints: number;
    level: number;
    rank: number;
}

export interface UserStats {
    totalPoints: number;
    level: number;
    achievements: UserAchievement[];
    categoryBreakdown: {
        evidence: number;
        methodology: number;
        consensus: number;
        collaboration: number;
    };
}
