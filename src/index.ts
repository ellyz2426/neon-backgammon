import {
	World,
	createSystem,
	PanelUI,
	PanelDocument,
	UIKitDocument,
	UIKit,
	Follower,
	ScreenSpace,
	eq,
	Mesh,
	Group,
	BoxGeometry,
	SphereGeometry,
	CylinderGeometry,
	PlaneGeometry,
	ConeGeometry,
	TorusGeometry,
	OctahedronGeometry,
	MeshStandardMaterial,
	MeshBasicMaterial,
	LineBasicMaterial,
	Color,
	Vector3,
	Quaternion,
	Euler,
	EdgesGeometry,
	LineSegments,
	AdditiveBlending,
	AmbientLight,
	PointLight,
	DirectionalLight,
	Fog,
	Float32BufferAttribute,
	BufferGeometry,
	Raycaster,
	Vector2,
	InputComponent,
} from '@iwsdk/core';

// ============================
// TYPES & CONSTANTS
// ============================

type PieceColor = 'white' | 'black';
type GameState = 'title' | 'modeSelect' | 'difficulty' | 'playing' | 'paused' | 'gameOver' | 'achievements' | 'settings' | 'help' | 'leaderboard' | 'stats' | 'skins' | 'countdown';

interface BackgammonState {
	board: number[]; // 24 points: positive=white, negative=black
	bar: { white: number; black: number };
	borneOff: { white: number; black: number };
	dice: number[];
	remainingMoves: number[];
	currentPlayer: PieceColor;
	doublingCube: number;
	cubeOwner: PieceColor | null;
	movesMade: number;
	gamePhase: 'rolling' | 'moving' | 'waiting';
}

interface GameConfig {
	mode: string;
	difficulty: string;
	pointsToWin: number;
}

interface Achievement {
	id: string;
	name: string;
	desc: string;
	condition: (s: SaveData) => boolean;
}

interface SaveData {
	games: number;
	wins: number;
	losses: number;
	totalMoves: number;
	doublesRolled: number;
	gammons: number;
	backgammons: number;
	bearOffs: number;
	hitsLanded: number;
	longestWinStreak: number;
	currentWinStreak: number;
	perfectGames: number;
	totalPoints: number;
	bestScore: number;
	achievementsUnlocked: string[];
	xp: number;
	level: number;
	skinIndex: number;
	themeIndex: number;
	dailyDate: string;
	dailyBest: number;
	modesPlayed: string[];
	matchWins: number;
	totalTime: number;
}

// Themes
const THEMES = [
	{ name: 'Neon Holodeck', grid: 0x00ffff, accent: 0x00ffff, bg: 0x000811, fog: 0x000811, dark: 0x003344, light: 0x005566, pip: 0x00dddd, piece1: 0x00eeff, piece2: 0xff4488, bar: 0x002233 },
	{ name: 'Crimson Arena', grid: 0xff4444, accent: 0xff4444, bg: 0x110000, fog: 0x110000, dark: 0x440000, light: 0x661111, pip: 0xff3333, piece1: 0xff6666, piece2: 0x4488ff, bar: 0x330000 },
	{ name: 'Toxic Neon', grid: 0x44ff44, accent: 0x44ff44, bg: 0x001100, fog: 0x001100, dark: 0x003300, light: 0x005500, pip: 0x33ff33, piece1: 0x66ff66, piece2: 0xff44ff, bar: 0x002200 },
	{ name: 'Ultra Violet', grid: 0xaa44ff, accent: 0xaa44ff, bg: 0x080011, fog: 0x080011, dark: 0x220044, light: 0x330066, pip: 0x9933ff, piece1: 0xbb66ff, piece2: 0xffaa44, bar: 0x110033 },
	{ name: 'Solar Blaze', grid: 0xff8800, accent: 0xff8800, bg: 0x110800, fog: 0x110800, dark: 0x442200, light: 0x663300, pip: 0xff7700, piece1: 0xffaa44, piece2: 0x4488ff, bar: 0x331100 },
];

const SKINS = [
	{ name: 'Classic Neon', unlock: 'default', p1: 0x00eeff, p2: 0xff4488 },
	{ name: 'Solar Flare', unlock: '50 games', p1: 0xff8800, p2: 0x4488ff },
	{ name: 'Frost Core', unlock: '5K score', p1: 0x88ccff, p2: 0xff4444 },
	{ name: 'Toxic Pulse', unlock: '10 wins', p1: 0x44ff44, p2: 0xff44ff },
	{ name: 'Plasma Pink', unlock: 'x5 combo', p1: 0xff44cc, p2: 0x44ccff },
	{ name: 'Royal Gold', unlock: 'gammon win', p1: 0xffdd44, p2: 0x4444ff },
	{ name: 'Void Purple', unlock: '25 games', p1: 0xaa44ff, p2: 0xff8844 },
	{ name: 'Inferno', unlock: 'all modes', p1: 0xff4400, p2: 0x00ffaa },
];

const MODES = [
	{ id: 'single', name: 'Single Game', desc: 'One game vs AI' },
	{ id: 'match3', name: 'Match to 3', desc: 'First to 3 points' },
	{ id: 'match5', name: 'Match to 5', desc: 'First to 5 points' },
	{ id: 'daily', name: 'Daily Challenge', desc: 'Seeded daily game' },
	{ id: 'blitz', name: 'Blitz', desc: '30s move timer' },
	{ id: 'practice', name: 'Practice', desc: 'Undo moves freely' },
	{ id: 'nackgammon', name: 'Nackgammon', desc: 'Nack Ballard variant' },
	{ id: 'hypergammon', name: 'Hypergammon', desc: '3 checkers each' },
];

const ACHIEVEMENTS: Achievement[] = [
	{ id: 'first_win', name: 'First Victory', desc: 'Win your first game', condition: s => s.wins >= 1 },
	{ id: 'ten_wins', name: 'Champion', desc: 'Win 10 games', condition: s => s.wins >= 10 },
	{ id: 'fifty_wins', name: 'Grandmaster', desc: 'Win 50 games', condition: s => s.wins >= 50 },
	{ id: 'first_gammon', name: 'Gammon!', desc: 'Win a gammon', condition: s => s.gammons >= 1 },
	{ id: 'backgammon_win', name: 'Backgammon!', desc: 'Win a backgammon', condition: s => s.backgammons >= 1 },
	{ id: 'doubles_5', name: 'Lucky Dice', desc: 'Roll doubles 5 times', condition: s => s.doublesRolled >= 5 },
	{ id: 'doubles_20', name: 'Double Trouble', desc: 'Roll doubles 20 times', condition: s => s.doublesRolled >= 20 },
	{ id: 'bear_10', name: 'Bear It Off', desc: 'Bear off 10 checkers', condition: s => s.bearOffs >= 10 },
	{ id: 'bear_100', name: 'Bearing Master', desc: 'Bear off 100 checkers', condition: s => s.bearOffs >= 100 },
	{ id: 'hits_10', name: 'Aggressive', desc: 'Hit 10 opponent checkers', condition: s => s.hitsLanded >= 10 },
	{ id: 'hits_50', name: 'Blitz Attack', desc: 'Hit 50 opponent checkers', condition: s => s.hitsLanded >= 50 },
	{ id: 'streak_3', name: 'Hot Streak', desc: 'Win 3 games in a row', condition: s => s.longestWinStreak >= 3 },
	{ id: 'streak_5', name: 'On Fire', desc: 'Win 5 games in a row', condition: s => s.longestWinStreak >= 5 },
	{ id: 'perfect', name: 'Flawless', desc: 'Win without opponent bearing off', condition: s => s.perfectGames >= 1 },
	{ id: 'games_10', name: 'Regular', desc: 'Play 10 games', condition: s => s.games >= 10 },
	{ id: 'games_50', name: 'Veteran', desc: 'Play 50 games', condition: s => s.games >= 50 },
	{ id: 'score_1k', name: 'Point Collector', desc: 'Earn 1000 total points', condition: s => s.totalPoints >= 1000 },
	{ id: 'score_5k', name: 'Point Hoarder', desc: 'Earn 5000 total points', condition: s => s.totalPoints >= 5000 },
	{ id: 'level_10', name: 'Rising Star', desc: 'Reach level 10', condition: s => s.level >= 10 },
	{ id: 'level_25', name: 'Expert', desc: 'Reach level 25', condition: s => s.level >= 25 },
	{ id: 'level_50', name: 'Legend', desc: 'Reach level 50', condition: s => s.level >= 50 },
	{ id: 'all_modes', name: 'Explorer', desc: 'Play all game modes', condition: s => s.modesPlayed.length >= MODES.length },
	{ id: 'match_win', name: 'Match Victor', desc: 'Win a match', condition: s => s.matchWins >= 1 },
	{ id: 'match_5', name: 'Match King', desc: 'Win 5 matches', condition: s => s.matchWins >= 5 },
	{ id: 'moves_500', name: 'Experienced', desc: 'Make 500 total moves', condition: s => s.totalMoves >= 500 },
	{ id: 'daily_done', name: 'Daily Player', desc: 'Complete a daily challenge', condition: s => s.dailyDate !== '' },
	{ id: 'skin_unlock', name: 'Fashionista', desc: 'Unlock a piece skin', condition: s => s.skinIndex > 0 },
	{ id: 'theme_all', name: 'Theme Tourist', desc: 'Try all themes', condition: s => s.themeIndex >= THEMES.length - 1 },
	{ id: 'time_60', name: 'Dedicated', desc: 'Play for 60 minutes total', condition: s => s.totalTime >= 3600 },
	{ id: 'blitz_win', name: 'Speed Demon', desc: 'Win a blitz game', condition: s => s.modesPlayed.includes('blitz') && s.wins > 0 },
	{ id: 'streak_10', name: 'Unstoppable', desc: 'Win 10 games in a row', condition: s => s.longestWinStreak >= 10 },
	{ id: 'hits_100', name: 'Demolition', desc: 'Hit 100 opponent checkers', condition: s => s.hitsLanded >= 100 },
	{ id: 'bear_500', name: 'Bear Master', desc: 'Bear off 500 checkers', condition: s => s.bearOffs >= 500 },
	{ id: 'games_100', name: 'Centurion', desc: 'Play 100 games', condition: s => s.games >= 100 },
	{ id: 'score_10k', name: 'Point Legend', desc: 'Earn 10000 total points', condition: s => s.totalPoints >= 10000 },
	{ id: 'doubles_50', name: 'Snake Eyes', desc: 'Roll doubles 50 times', condition: s => s.doublesRolled >= 50 },
	{ id: 'match_10', name: 'Match Emperor', desc: 'Win 10 matches', condition: s => s.matchWins >= 10 },
	{ id: 'moves_2000', name: 'Grandmaster', desc: 'Make 2000 total moves', condition: s => s.totalMoves >= 2000 },
	{ id: 'time_300', name: 'Marathon', desc: 'Play for 5 hours total', condition: s => s.totalTime >= 18000 },
	{ id: 'gammons_5', name: 'Gammon Hunter', desc: 'Win 5 gammons', condition: s => s.gammons >= 5 },
];

const LEVEL_TITLES = ['Novice', 'Beginner', 'Apprentice', 'Student', 'Player', 'Competitor', 'Contender', 'Challenger', 'Strategist', 'Tactician', 'Expert', 'Master', 'Grandmaster', 'Champion', 'Elite', 'Virtuoso', 'Prodigy', 'Legend', 'Mythic', 'NEON GOD'];

// ============================
// SAVE SYSTEM
// ============================

function defaultSave(): SaveData {
	return {
		games: 0, wins: 0, losses: 0, totalMoves: 0, doublesRolled: 0,
		gammons: 0, backgammons: 0, bearOffs: 0, hitsLanded: 0,
		longestWinStreak: 0, currentWinStreak: 0, perfectGames: 0,
		totalPoints: 0, bestScore: 0, achievementsUnlocked: [],
		xp: 0, level: 1, skinIndex: 0, themeIndex: 0,
		dailyDate: '', dailyBest: 0, modesPlayed: [], matchWins: 0, totalTime: 0,
	};
}

function loadSave(): SaveData {
	try {
		const raw = localStorage.getItem('neon-backgammon-save');
		if (raw) return { ...defaultSave(), ...JSON.parse(raw) };
	} catch { /* ignore */ }
	return defaultSave();
}

function saveSave(data: SaveData) {
	try { localStorage.setItem('neon-backgammon-save', JSON.stringify(data)); } catch { /* ignore */ }
}

// ============================
// SEEDED RNG
// ============================

function mulberry32(seed: number) {
	return () => {
		seed |= 0; seed = seed + 0x6D2B79F5 | 0;
		let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
		t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
		return ((t ^ t >>> 14) >>> 0) / 4294967296;
	};
}

function dateToSeed(d: Date): number {
	return d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate();
}

// ============================
// BACKGAMMON GAME LOGIC
// ============================

function initialBoard(): number[] {
	// Standard backgammon: points 0-23 (0=player's 1-point, 23=player's 24-point)
	// Positive = white, Negative = black
	const b = new Array(24).fill(0);
	b[0] = 2;   // White 2 on point 1
	b[5] = -5;  // Black 5 on point 6
	b[7] = -3;  // Black 3 on point 8
	b[11] = 5;  // White 5 on point 12
	b[12] = -5; // Black 5 on point 13
	b[16] = 3;  // White 3 on point 17
	b[18] = 5;  // White 5 on point 19
	b[23] = -2; // Black 2 on point 24
	return b;
}

function nackgammonBoard(): number[] {
	const b = new Array(24).fill(0);
	b[0] = 2; b[1] = 2; b[5] = -4; b[7] = -3;
	b[11] = 4; b[12] = -4; b[16] = 3;
	b[18] = 4; b[22] = -2; b[23] = -2;
	return b;
}

function hypergammonBoard(): number[] {
	const b = new Array(24).fill(0);
	b[0] = 1; b[1] = 1; b[2] = 1;
	b[21] = -1; b[22] = -1; b[23] = -1;
	return b;
}

function newGame(mode: string): BackgammonState {
	let board: number[];
	if (mode === 'nackgammon') board = nackgammonBoard();
	else if (mode === 'hypergammon') board = hypergammonBoard();
	else board = initialBoard();
	return {
		board,
		bar: { white: 0, black: 0 },
		borneOff: { white: 0, black: 0 },
		dice: [],
		remainingMoves: [],
		currentPlayer: 'white',
		doublingCube: 1,
		cubeOwner: null,
		movesMade: 0,
		gamePhase: 'rolling',
	};
}

function rollDice(rng?: () => number): [number, number] {
	const r = rng || Math.random;
	return [Math.floor(r() * 6) + 1, Math.floor(r() * 6) + 1];
}

function getMovesForDice(d1: number, d2: number): number[] {
	if (d1 === d2) return [d1, d1, d1, d1];
	return [d1, d2];
}

function pointOwner(val: number): PieceColor | null {
	if (val > 0) return 'white';
	if (val < 0) return 'black';
	return null;
}

function pieceCount(val: number): number { return Math.abs(val); }
function direction(player: PieceColor): number { return player === 'white' ? 1 : -1; }
function homeStart(player: PieceColor): number { return player === 'white' ? 18 : 0; }
function homeEnd(player: PieceColor): number { return player === 'white' ? 23 : 5; }
function totalCheckers(player: PieceColor): number { return player === 'hypergammon' as PieceColor ? 3 : 15; }

function isInHome(board: number[], bar: { white: number; black: number }, player: PieceColor): boolean {
	if (bar[player] > 0) return false;
	const hs = homeStart(player);
	const he = homeEnd(player);
	for (let i = 0; i < 24; i++) {
		const val = board[i];
		const owner = pointOwner(val);
		if (owner === player && (i < hs || i > he)) return false;
	}
	return true;
}

function canBearOff(board: number[], bar: { white: number; black: number }, player: PieceColor): boolean {
	return isInHome(board, bar, player);
}

function getLegalMoves(state: BackgammonState, die: number): number[][] {
	const { board, bar, currentPlayer: player } = state;
	const moves: number[][] = [];
	const dir = direction(player);

	// Must enter from bar first
	if (bar[player] > 0) {
		const entryPoint = player === 'white' ? die - 1 : 24 - die;
		if (entryPoint >= 0 && entryPoint < 24) {
			const target = board[entryPoint];
			const owner = pointOwner(target);
			if (owner === null || owner === player || pieceCount(target) <= 1) {
				moves.push([-1, entryPoint]); // -1 = from bar
			}
		}
		return moves; // Must enter before moving other pieces
	}

	// Regular moves
	for (let from = 0; from < 24; from++) {
		const val = board[from];
		const owner = pointOwner(val);
		if (owner !== player) continue;

		const to = from + die * dir;
		if (to >= 0 && to < 24) {
			const target = board[to];
			const tOwner = pointOwner(target);
			if (tOwner === null || tOwner === player || pieceCount(target) <= 1) {
				moves.push([from, to]);
			}
		} else if (canBearOff(board, bar, player)) {
			// Bearing off
			if (player === 'white' && to >= 24) {
				// Exact or highest checker
				if (to === 24 || !hasHigherChecker(board, player, from)) {
					moves.push([from, 24]); // 24 = bear off
				}
			} else if (player === 'black' && to < 0) {
				if (to === -1 || !hasHigherChecker(board, player, from)) {
					moves.push([from, -2]); // -2 = bear off for black
				}
			}
		}
	}
	return moves;
}

function hasHigherChecker(board: number[], player: PieceColor, point: number): boolean {
	if (player === 'white') {
		// Higher = further from bearing off = lower index
		for (let i = 0; i < point; i++) {
			if (pointOwner(board[i]) === player) return true;
		}
	} else {
		// Higher = further from bearing off = higher index
		for (let i = point + 1; i < 24; i++) {
			if (pointOwner(board[i]) === player) return true;
		}
	}
	return false;
}

function applyMove(state: BackgammonState, from: number, to: number): { hit: boolean } {
	const { board, bar, borneOff, currentPlayer: player } = state;
	const sign = player === 'white' ? 1 : -1;
	let hit = false;

	// Remove from source
	if (from === -1) {
		bar[player]--;
	} else {
		board[from] -= sign;
	}

	// Bearing off
	if (to === 24 || to === -2) {
		borneOff[player]++;
		return { hit: false };
	}

	// Check for hit
	const targetOwner = pointOwner(board[to]);
	if (targetOwner !== null && targetOwner !== player && pieceCount(board[to]) === 1) {
		// Hit!
		const opponent: PieceColor = player === 'white' ? 'black' : 'white';
		board[to] = 0;
		bar[opponent]++;
		hit = true;
	}

	board[to] += sign;
	return { hit };
}

function hasAnyLegalMove(state: BackgammonState): boolean {
	for (const die of state.remainingMoves) {
		if (getLegalMoves(state, die).length > 0) return true;
	}
	return false;
}

function isGameOver(state: BackgammonState): PieceColor | null {
	if (state.borneOff.white >= 15) return 'white';
	if (state.borneOff.black >= 15) return 'black';
	return null;
}

function getWinType(state: BackgammonState, winner: PieceColor): 'normal' | 'gammon' | 'backgammon' {
	const loser: PieceColor = winner === 'white' ? 'black' : 'white';
	if (state.borneOff[loser] === 0) {
		// Check if loser has checkers in winner's home or on bar
		if (state.bar[loser] > 0) return 'backgammon';
		const hs = homeStart(winner);
		const he = homeEnd(winner);
		for (let i = hs; i <= he; i++) {
			if (pointOwner(state.board[i]) === loser) return 'backgammon';
		}
		return 'gammon';
	}
	return 'normal';
}

// ============================
// AI
// ============================

function evaluateBoard(state: BackgammonState, player: PieceColor): number {
	const opp: PieceColor = player === 'white' ? 'black' : 'white';
	let score = 0;

	// Borne off
	score += state.borneOff[player] * 100;
	score -= state.borneOff[opp] * 100;

	// Bar penalty
	score -= state.bar[player] * 80;
	score += state.bar[opp] * 60;

	// Board evaluation
	for (let i = 0; i < 24; i++) {
		const val = state.board[i];
		const owner = pointOwner(val);
		const count = pieceCount(val);
		if (owner === player) {
			// Made points (2+ checkers) are valuable
			if (count >= 2) score += 15;
			// Home board made points are extra valuable
			const hs = homeStart(player);
			const he = homeEnd(player);
			if (i >= hs && i <= he) {
				score += count * 5;
				if (count >= 2) score += 10;
			}
			// Blots (single checkers) are risky
			if (count === 1) {
				// Penalty based on exposure
				score -= 15;
				// Extra penalty if not in home board
				if (i < hs || i > he) score -= 5;
			}
			// Pip count (distance to bear off) - lower is better
			if (player === 'white') {
				score -= (23 - i) * count * 2;
			} else {
				score -= i * count * 2;
			}
		}
	}
	return score;
}

function aiSelectMove(state: BackgammonState, difficulty: string): number[] | null {
	const moves = getAllPossiblePlays(state);
	if (moves.length === 0) return null;

	if (difficulty === 'Easy') {
		// Random valid move
		const validSingle: number[][] = [];
		for (const die of state.remainingMoves) {
			for (const m of getLegalMoves(state, die)) {
				validSingle.push([...m, die]);
			}
		}
		if (validSingle.length === 0) return null;
		return validSingle[Math.floor(Math.random() * validSingle.length)];
	}

	// Medium/Hard: evaluate using full-turn look-ahead
	// For Hard: evaluate all sequences of remaining dice, pick the overall best single move
	// that leads to the best complete turn evaluation
	let bestScore = -Infinity;
	let bestMove: number[] | null = null;

	if (difficulty === 'Hard' && state.remainingMoves.length > 1) {
		// Full-turn evaluation: try each first move, then recursively evaluate best remaining
		for (const die of new Set(state.remainingMoves)) {
			const legalMoves = getLegalMoves(state, die);
			for (const move of legalMoves) {
				const cloned = cloneState(state);
				applyMove(cloned, move[0], move[1]);
				const idx = cloned.remainingMoves.indexOf(die);
				if (idx >= 0) cloned.remainingMoves.splice(idx, 1);

				// Recursively evaluate remaining moves
				let turnScore = evaluateFullTurn(cloned, state.currentPlayer, 0);

				if (turnScore > bestScore) {
					bestScore = turnScore;
					bestMove = [...move, die];
				}
			}
		}
	} else {
		// Single move evaluation (Medium or last move)
		for (const die of state.remainingMoves) {
			const legalMoves = getLegalMoves(state, die);
			for (const move of legalMoves) {
				const cloned = cloneState(state);
				applyMove(cloned, move[0], move[1]);

				let score = evaluateBoard(cloned, state.currentPlayer);

				if (difficulty === 'Medium') {
					score += (Math.random() - 0.5) * 40;
				}

				if (score > bestScore) {
					bestScore = score;
					bestMove = [...move, die];
				}
			}
		}
	}

	return bestMove;
}

function evaluateFullTurn(state: BackgammonState, player: PieceColor, depth: number): number {
	if (state.remainingMoves.length === 0 || depth > 3) {
		return evaluateBoard(state, player);
	}

	let bestScore = evaluateBoard(state, player); // Baseline if no moves work

	for (const die of new Set(state.remainingMoves)) {
		const legalMoves = getLegalMoves(state, die);
		for (const move of legalMoves) {
			const cloned = cloneState(state);
			applyMove(cloned, move[0], move[1]);
			const idx = cloned.remainingMoves.indexOf(die);
			if (idx >= 0) cloned.remainingMoves.splice(idx, 1);
			const score = evaluateFullTurn(cloned, player, depth + 1);
			if (score > bestScore) bestScore = score;
		}
	}
	return bestScore;
}

function getAllPossiblePlays(state: BackgammonState): number[][] {
	const plays: number[][] = [];
	for (const die of state.remainingMoves) {
		for (const m of getLegalMoves(state, die)) {
			plays.push([...m, die]);
		}
	}
	return plays;
}

function cloneState(state: BackgammonState): BackgammonState {
	return {
		board: [...state.board],
		bar: { ...state.bar },
		borneOff: { ...state.borneOff },
		dice: [...state.dice],
		remainingMoves: [...state.remainingMoves],
		currentPlayer: state.currentPlayer,
		doublingCube: state.doublingCube,
		cubeOwner: state.cubeOwner,
		movesMade: state.movesMade,
		gamePhase: state.gamePhase,
	};
}

function calcPipCount(state: BackgammonState, player: PieceColor): number {
	let pips = 0;
	for (let i = 0; i < 24; i++) {
		const val = state.board[i];
		const owner = pointOwner(val);
		if (owner === player) {
			const count = pieceCount(val);
			pips += (player === 'white' ? (24 - i) : (i + 1)) * count;
		}
	}
	pips += state.bar[player] * 25;
	return pips;
}

function canDouble(state: BackgammonState, player: PieceColor): boolean {
	// Can double if cube is centered (no owner) or player owns it
	// And cube value is under 64 (practical limit)
	if (state.doublingCube >= 64) return false;
	return state.cubeOwner === null || state.cubeOwner === player;
}

function aiAcceptsDouble(state: BackgammonState): boolean {
	// AI evaluates position to decide whether to accept a double
	const aiScore = evaluateBoard(state, 'black');
	const playerScore = evaluateBoard(state, 'white');
	const diff = aiScore - playerScore;
	// Accept if not too far behind (threshold based on difficulty)
	// In backgammon theory, you should accept if you win >= 25% of the time
	// We approximate this with the evaluation difference
	return diff > -200;
}

// ============================
// AUDIO
// ============================

class AudioManager {
	private ctx: AudioContext | null = null;
	private masterVol = 0.7;
	private sfxVol = 0.8;
	private musicVol = 0.3;
	private droneGain: GainNode | null = null;
	private droneStarted = false;

	private getCtx(): AudioContext {
		if (!this.ctx) this.ctx = new AudioContext();
		if (this.ctx.state === 'suspended') this.ctx.resume();
		return this.ctx;
	}

	private play(freq: number, type: OscillatorType, dur: number, vol = 0.3, delay = 0) {
		const ctx = this.getCtx();
		const osc = ctx.createOscillator();
		const gain = ctx.createGain();
		osc.type = type;
		osc.frequency.value = freq * (0.95 + Math.random() * 0.1);
		gain.gain.value = vol * this.sfxVol * this.masterVol;
		gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay + dur);
		osc.connect(gain).connect(ctx.destination);
		osc.start(ctx.currentTime + delay);
		osc.stop(ctx.currentTime + delay + dur);
	}

	diceRoll() {
		for (let i = 0; i < 6; i++) {
			this.play(800 + Math.random() * 400, 'square', 0.05, 0.15, i * 0.04);
		}
	}

	pieceMove() { this.play(440, 'triangle', 0.12, 0.25); }
	pieceHit() { this.play(220, 'sawtooth', 0.25, 0.35); this.play(330, 'square', 0.15, 0.2, 0.05); }
	bearOff() { this.play(660, 'sine', 0.2, 0.3); this.play(880, 'sine', 0.15, 0.25, 0.1); }

	win() {
		const notes = [523, 659, 784, 1047];
		notes.forEach((f, i) => this.play(f, 'sine', 0.3, 0.3, i * 0.12));
	}

	lose() {
		const notes = [440, 370, 311, 261];
		notes.forEach((f, i) => this.play(f, 'sawtooth', 0.3, 0.2, i * 0.15));
	}

	click() { this.play(1200, 'sine', 0.06, 0.15); }

	countdown() { this.play(880, 'sine', 0.1, 0.2); }
	countdownGo() { this.play(1320, 'sine', 0.3, 0.3); }

	achievement() {
		const notes = [523, 659, 784, 880, 1047];
		notes.forEach((f, i) => this.play(f, 'sine', 0.2, 0.25, i * 0.08));
	}

	gammon() {
		const notes = [523, 659, 784, 1047, 1319, 1568];
		notes.forEach((f, i) => this.play(f, 'triangle', 0.25, 0.3, i * 0.1));
	}

	startDrone() {
		if (this.droneStarted) return;
		this.droneStarted = true;
		const ctx = this.getCtx();
		this.droneGain = ctx.createGain();
		this.droneGain.gain.value = this.musicVol * this.masterVol * 0.15;
		this.droneGain.connect(ctx.destination);

		const lfo = ctx.createOscillator();
		const lfoGain = ctx.createGain();
		lfo.frequency.value = 0.15;
		lfoGain.gain.value = 3;
		lfo.connect(lfoGain);

		[55, 82.5, 110].forEach(freq => {
			const osc = ctx.createOscillator();
			osc.type = freq === 82.5 ? 'triangle' : 'sine';
			osc.frequency.value = freq;
			lfoGain.connect(osc.frequency);
			const filter = ctx.createBiquadFilter();
			filter.type = 'lowpass';
			filter.frequency.value = 400;
			osc.connect(filter).connect(this.droneGain!);
			osc.start();
		});
		lfo.start();
	}

	setMaster(v: number) { this.masterVol = v; this.updateDrone(); }
	setSfx(v: number) { this.sfxVol = v; }
	setMusic(v: number) { this.musicVol = v; this.updateDrone(); }
	private updateDrone() {
		if (this.droneGain) this.droneGain.gain.value = this.musicVol * this.masterVol * 0.15;
	}
}

// ============================
// PARTICLE SYSTEM
// ============================

interface Particle {
	mesh: Mesh;
	vx: number; vy: number; vz: number;
	life: number; maxLife: number;
	active: boolean;
}

class ParticlePool {
	private particles: Particle[] = [];
	private scene: Group;

	constructor(scene: Group, count: number) {
		this.scene = scene;
		const geo = new SphereGeometry(0.012, 4, 4);
		for (let i = 0; i < count; i++) {
			const mat = new MeshBasicMaterial({ color: 0x00ffff, transparent: true, blending: AdditiveBlending });
			const mesh = new Mesh(geo, mat);
			mesh.visible = false;
			scene.add(mesh);
			this.particles.push({ mesh, vx: 0, vy: 0, vz: 0, life: 0, maxLife: 1, active: false });
		}
	}

	burst(x: number, y: number, z: number, color: number, count: number) {
		let spawned = 0;
		for (const p of this.particles) {
			if (p.active) continue;
			if (spawned >= count) break;
			p.mesh.position.set(x, y, z);
			p.vx = (Math.random() - 0.5) * 2;
			p.vy = Math.random() * 2 + 1;
			p.vz = (Math.random() - 0.5) * 2;
			p.life = 0;
			p.maxLife = 0.5 + Math.random() * 0.5;
			p.active = true;
			p.mesh.visible = true;
			(p.mesh.material as MeshBasicMaterial).color.set(color);
			spawned++;
		}
	}

	update(dt: number) {
		for (const p of this.particles) {
			if (!p.active) continue;
			p.life += dt;
			if (p.life >= p.maxLife) {
				p.active = false;
				p.mesh.visible = false;
				continue;
			}
			p.mesh.position.x += p.vx * dt;
			p.mesh.position.y += p.vy * dt;
			p.mesh.position.z += p.vz * dt;
			p.vy -= 4 * dt;
			(p.mesh.material as MeshBasicMaterial).opacity = 1 - p.life / p.maxLife;
		}
	}
}

// ============================
// MAIN
// ============================

async function main() {
	const container = document.getElementById('app') as HTMLDivElement;

	const world = await World.create(container, {
		xr: { offer: 'once' },
		render: { fov: 60 },
	} as any);

	const audio = new AudioManager();

	// Set camera position for a good board view
	world.camera.position.set(0, 2.5, 2.2);
	world.camera.lookAt(0, 0.3, -0.3);

	const save = loadSave();
	const particles = new ParticlePool(world.scene as unknown as Group, 150);

	let gameState: GameState = 'title';
	let bgState: BackgammonState = newGame('single');
	let config: GameConfig = { mode: 'single', difficulty: 'Medium', pointsToWin: 1 };
	let matchScore = { white: 0, black: 0 };
	let selectedPoint = -2; // -2 = none selected
	let blitzTimer = 30;
	let countdownVal = 3;
	let countdownTimer = 0;
	let aiThinkTimer = 0;
	let sessionStartTime = Date.now();
	let highlightedMoves: number[][] = [];
	let lastRng: (() => number) | undefined;
	let moveAnimTimer = 0;
	let moveHistory: BackgammonState[] = [];
	let undoAvailable = false;
	let leaderboardScores: { mode: string; score: number; date: string; winType: string }[] = [];
	let moveAnim: { fromPos: Vector3; toPos: Vector3; progress: number; checkerIdx: number; duration: number } | null = null;
	let hoveredPoint = -2;

	// Load leaderboard
	try {
		const lbRaw = localStorage.getItem('neon-backgammon-leaderboard');
		if (lbRaw) leaderboardScores = JSON.parse(lbRaw);
	} catch { /* ignore */ }

	// Theme
	let theme = THEMES[save.themeIndex];
	let skin = SKINS[save.skinIndex];

	// ============================
	// 3D BOARD SETUP
	// ============================

	const boardGroup = new Group();
	world.scene.add(boardGroup);

	// Board surface
	const boardGeo = new BoxGeometry(1.6, 0.08, 1.2);
	const boardMat = new MeshStandardMaterial({ color: theme.dark, emissive: new Color(theme.dark).multiplyScalar(0.3), metalness: 0.6, roughness: 0.4 });
	const boardMesh = new Mesh(boardGeo, boardMat);
	boardMesh.position.set(0, 0.3, -0.3);
	boardGroup.add(boardMesh);

	// Board edge frame
	const edgeGeo = new EdgesGeometry(boardGeo);
	const edgeMat = new LineBasicMaterial({ color: theme.accent, transparent: true, opacity: 0.6 });
	const edgeLine = new LineSegments(edgeGeo, edgeMat);
	boardMesh.add(edgeLine);

	// Center bar
	const barGeo = new BoxGeometry(0.06, 0.1, 1.2);
	const barMat = new MeshStandardMaterial({ color: theme.bar, emissive: new Color(theme.bar).multiplyScalar(0.5), metalness: 0.7 });
	const barMesh = new Mesh(barGeo, barMat);
	barMesh.position.set(0, 0.05, 0);
	boardMesh.add(barMesh);

	// Point triangles (24)
	const pointMeshes: Mesh[] = [];
	const pointWidth = 0.12;
	const pointHeight = 0.45;

	for (let i = 0; i < 24; i++) {
		const isTop = i >= 12;
		const posInHalf = isTop ? 23 - i : i;
		const half = posInHalf < 6 ? 0 : 1; // 0=right, 1=left
		const col = posInHalf % 6;

		const x = (half === 0 ? 0.1 : -0.7) + col * pointWidth + pointWidth / 2;
		const z = isTop ? -0.57 : 0.57;
		const isDark = i % 2 === 0;

		const shape = new Float32BufferAttribute([
			-pointWidth / 2, 0, 0,
			pointWidth / 2, 0, 0,
			0, 0, (isTop ? 1 : -1) * pointHeight,
		], 3);
		const triGeo = new BufferGeometry();
		triGeo.setAttribute('position', shape);
		triGeo.computeVertexNormals();

		const color = isDark ? theme.dark : theme.light;
		const triMat = new MeshStandardMaterial({
			color,
			emissive: new Color(color).multiplyScalar(0.3),
			metalness: 0.4,
			roughness: 0.5,
			transparent: true,
			opacity: 0.8,
			side: 2,
		});

		const triMesh = new Mesh(triGeo, triMat);
		triMesh.position.set(x, 0.041, z);
		triMesh.rotation.x = -Math.PI / 2;
		boardMesh.add(triMesh);
		pointMeshes.push(triMesh);
	}

	// Checker meshes pool
	interface CheckerMesh {
		mesh: Mesh;
		glow: Mesh;
		wireframe: LineSegments;
	}

	const checkerMeshes: CheckerMesh[] = [];
	const checkerGeo = new CylinderGeometry(0.04, 0.04, 0.015, 16);
	const checkerEdges = new EdgesGeometry(checkerGeo);

	for (let i = 0; i < 32; i++) {
		const mat = new MeshStandardMaterial({ color: 0x00ffff, emissive: new Color(0x00ffff).multiplyScalar(0.5), metalness: 0.5, roughness: 0.3 });
		const mesh = new Mesh(checkerGeo, mat);
		mesh.visible = false;

		const glowGeo = new CylinderGeometry(0.045, 0.045, 0.01, 16);
		const glowMat = new MeshBasicMaterial({ color: 0x00ffff, transparent: true, opacity: 0.3, blending: AdditiveBlending });
		const glow = new Mesh(glowGeo, glowMat);
		mesh.add(glow);

		const wf = new LineSegments(checkerEdges, new LineBasicMaterial({ color: 0x00ffff, transparent: true, opacity: 0.5 }));
		mesh.add(wf);

		boardMesh.add(mesh);
		checkerMeshes.push({ mesh, glow, wireframe: wf });
	}

	// Dice 3D
	const dice3D: Mesh[] = [];
	const diceGeo = new BoxGeometry(0.06, 0.06, 0.06);

	for (let i = 0; i < 2; i++) {
		const mat = new MeshStandardMaterial({ color: 0xffffff, emissive: new Color(theme.accent).multiplyScalar(0.3), metalness: 0.3, roughness: 0.5 });
		const mesh = new Mesh(diceGeo, mat);
		const edges = new LineSegments(new EdgesGeometry(diceGeo), new LineBasicMaterial({ color: theme.accent }));
		mesh.add(edges);
		mesh.visible = false;
		mesh.position.set(i === 0 ? -0.15 : 0.15, 0.08, 0);
		boardMesh.add(mesh);
		dice3D.push(mesh);
	}

	// Highlight rings for legal moves
	const highlightRings: Mesh[] = [];
	const ringGeo = new TorusGeometry(0.05, 0.005, 8, 16);
	for (let i = 0; i < 8; i++) {
		const mat = new MeshBasicMaterial({ color: 0x44ff44, transparent: true, opacity: 0.6, blending: AdditiveBlending });
		const ring = new Mesh(ringGeo, mat);
		ring.visible = false;
		ring.rotation.x = -Math.PI / 2;
		boardMesh.add(ring);
		highlightRings.push(ring);
	}

	// Borne off trays
	const bornOffGroups = { white: new Group(), black: new Group() };
	bornOffGroups.white.position.set(0.85, 0.04, 0);
	bornOffGroups.black.position.set(-0.85, 0.04, 0);
	boardMesh.add(bornOffGroups.white);
	boardMesh.add(bornOffGroups.black);

	// Point number labels (small indicator dots)
	for (let i = 0; i < 24; i++) {
		const dotGeo = new SphereGeometry(0.008, 6, 6);
		const dotMat = new MeshBasicMaterial({ color: theme.pip, transparent: true, opacity: 0.4 });
		const dot = new Mesh(dotGeo, dotMat);
		const pm = pointMeshes[i];
		dot.position.copy(pm.position);
		dot.position.y = 0.042;
		if (i < 12) dot.position.z += 0.02;
		else dot.position.z -= 0.02;
		boardMesh.add(dot);
	}

	// Point coordinate markers (colored pips at board edge showing point numbers)
	for (let i = 0; i < 24; i++) {
		const markerGeo = new CylinderGeometry(0.006, 0.006, 0.003, 8);
		const isWhiteHome = i >= 18 && i <= 23;
		const isBlackHome = i >= 0 && i <= 5;
		const markerColor = isWhiteHome ? skin.p1 : isBlackHome ? skin.p2 : theme.pip;
		const markerMat = new MeshBasicMaterial({ color: markerColor, transparent: true, opacity: 0.6 });
		const marker = new Mesh(markerGeo, markerMat);
		const pm = pointMeshes[i];
		marker.position.copy(pm.position);
		marker.position.y = 0.041;
		// Place at the edge of the board
		if (i < 12) marker.position.z = 0.58;
		else marker.position.z = -0.58;
		boardMesh.add(marker);
	}

	// Doubling cube 3D mesh
	const cubeGeo = new BoxGeometry(0.05, 0.05, 0.05);
	const cubeMat = new MeshStandardMaterial({ color: 0xffdd44, emissive: new Color(0xffdd44).multiplyScalar(0.4), metalness: 0.4, roughness: 0.4 });
	const cubeMesh = new Mesh(cubeGeo, cubeMat);
	const cubeEdges = new LineSegments(new EdgesGeometry(cubeGeo), new LineBasicMaterial({ color: 0xffaa00 }));
	cubeMesh.add(cubeEdges);
	cubeMesh.position.set(0, 0.08, 0.65);
	boardMesh.add(cubeMesh);

	// ============================
	// ENVIRONMENT (Holodeck)
	// ============================

	world.scene.fog = new Fog(theme.fog, 3, 15);

	const gridFloor = createGrid(20, theme.grid);
	gridFloor.position.y = -0.01;
	world.scene.add(gridFloor);

	const gridCeiling = createGrid(20, theme.grid);
	gridCeiling.position.y = 4;
	gridCeiling.rotation.x = Math.PI;
	world.scene.add(gridCeiling);

	// Lights
	const ambient = new AmbientLight(0x222233, 0.4);
	world.scene.add(ambient);
	const dirLight = new DirectionalLight(0xffffff, 0.6);
	dirLight.position.set(2, 4, 3);
	world.scene.add(dirLight);
	const accent1 = new PointLight(theme.accent, 1, 8);
	accent1.position.set(1, 2, 1);
	world.scene.add(accent1);
	const accent2 = new PointLight(theme.piece2, 0.5, 8);
	accent2.position.set(-1, 2, -1);
	world.scene.add(accent2);
	const boardLight = new PointLight(0xffffff, 0.8, 4);
	boardLight.position.set(0, 1.5, -0.3);
	world.scene.add(boardLight);

	// Floating decorations
	const decorations: { mesh: Mesh; speed: number; bobSpeed: number; baseY: number }[] = [];
	const decoTypes = [
		() => new TorusGeometry(0.08, 0.02, 8, 16),
		() => new BoxGeometry(0.1, 0.1, 0.1),
		() => new SphereGeometry(0.06, 8, 8),
		() => new ConeGeometry(0.05, 0.1, 6),
	];
	for (let i = 0; i < 14; i++) {
		const geo = decoTypes[i % 4]();
		const mat = new MeshBasicMaterial({
			color: theme.accent,
			wireframe: true,
			transparent: true,
			opacity: 0.15,
		});
		const mesh = new Mesh(geo, mat);
		const angle = (i / 14) * Math.PI * 2;
		const radius = 3 + Math.random() * 3;
		const y = 0.5 + Math.random() * 3;
		mesh.position.set(Math.cos(angle) * radius, y, Math.sin(angle) * radius);
		world.scene.add(mesh);
		decorations.push({ mesh, speed: 0.2 + Math.random() * 0.3, bobSpeed: 0.5 + Math.random() * 0.5, baseY: y });
	}

	// Ambient floating particles
	const ambientParticles: { mesh: Mesh; baseY: number; speed: number; phase: number }[] = [];
	for (let i = 0; i < 40; i++) {
		const geo = new SphereGeometry(0.005, 4, 4);
		const mat = new MeshBasicMaterial({ color: theme.accent, transparent: true, opacity: 0.3, blending: AdditiveBlending });
		const mesh = new Mesh(geo, mat);
		const angle = Math.random() * Math.PI * 2;
		const radius = 1 + Math.random() * 5;
		const y = Math.random() * 3.5;
		mesh.position.set(Math.cos(angle) * radius, y, Math.sin(angle) * radius);
		world.scene.add(mesh);
		ambientParticles.push({ mesh, baseY: y, speed: 0.1 + Math.random() * 0.2, phase: Math.random() * Math.PI * 2 });
	}

	function createGrid(size: number, color: number): Group {
		const g = new Group();
		const mat = new LineBasicMaterial({ color, transparent: true, opacity: 0.12 });
		for (let i = -size / 2; i <= size / 2; i++) {
			const pts1 = [new Vector3(i, 0, -size / 2), new Vector3(i, 0, size / 2)];
			const pts2 = [new Vector3(-size / 2, 0, i), new Vector3(size / 2, 0, i)];
			const g1 = new BufferGeometry().setFromPoints(pts1);
			const g2 = new BufferGeometry().setFromPoints(pts2);
			g.add(new LineSegments(g1, mat));
			g.add(new LineSegments(g2, mat));
		}
		return g;
	}

	// ============================
	// BOARD RENDERING
	// ============================

	function getPointWorldPos(pointIndex: number): Vector3 {
		const pm = pointMeshes[pointIndex];
		const pos = new Vector3();
		pos.copy(pm.position);
		// Move to base of triangle
		if (pointIndex < 12) pos.z -= 0.02;
		else pos.z += 0.02;
		return pos;
	}

	function renderBoard() {
		// Hide all checkers first
		for (const cm of checkerMeshes) cm.mesh.visible = false;

		let checkerIdx = 0;

		const p1Color = skin.p1;
		const p2Color = skin.p2;

		// Render pieces on points
		for (let i = 0; i < 24; i++) {
			const val = bgState.board[i];
			if (val === 0) continue;
			const count = pieceCount(val);
			const isWhite = val > 0;
			const color = isWhite ? p1Color : p2Color;
			const basePos = getPointWorldPos(i);

			for (let j = 0; j < Math.min(count, 5); j++) {
				if (checkerIdx >= checkerMeshes.length) break;
				const cm = checkerMeshes[checkerIdx];
				cm.mesh.visible = true;
				(cm.mesh.material as MeshStandardMaterial).color.set(color);
				(cm.mesh.material as MeshStandardMaterial).emissive.set(new Color(color).multiplyScalar(0.5));
				(cm.glow.material as MeshBasicMaterial).color.set(color);
				(cm.wireframe.material as LineBasicMaterial).color.set(color);

				const stackDir = i < 12 ? -1 : 1;
				cm.mesh.position.set(
					basePos.x,
					basePos.y + 0.008,
					basePos.z + stackDir * j * 0.08
				);

				// Highlight selected
				if (selectedPoint === i) {
					(cm.glow.material as MeshBasicMaterial).opacity = 0.6;
				} else if (hoveredPoint === i && pointOwner(bgState.board[i]) === 'white') {
					(cm.glow.material as MeshBasicMaterial).opacity = 0.45;
				} else {
					(cm.glow.material as MeshBasicMaterial).opacity = 0.3;
				}

				checkerIdx++;
			}
			// Stack indicator for 6+
			if (count > 5 && checkerIdx > 0) {
				// Just make the top one brighter
				const topCm = checkerMeshes[checkerIdx - 1];
				(topCm.glow.material as MeshBasicMaterial).opacity = 0.8;
			}
		}

		// Render bar pieces
		for (const player of ['white', 'black'] as PieceColor[]) {
			const barCount = bgState.bar[player];
			const color = player === 'white' ? p1Color : p2Color;
			for (let j = 0; j < barCount; j++) {
				if (checkerIdx >= checkerMeshes.length) break;
				const cm = checkerMeshes[checkerIdx];
				cm.mesh.visible = true;
				(cm.mesh.material as MeshStandardMaterial).color.set(color);
				(cm.mesh.material as MeshStandardMaterial).emissive.set(new Color(color).multiplyScalar(0.5));
				(cm.glow.material as MeshBasicMaterial).color.set(color);
				(cm.wireframe.material as LineBasicMaterial).color.set(color);
				const z = player === 'white' ? 0.3 - j * 0.08 : -0.3 + j * 0.08;
				cm.mesh.position.set(0, 0.06 + j * 0.02, z);
				checkerIdx++;
			}
		}

		// Render dice
		for (let i = 0; i < 2; i++) {
			if (bgState.dice.length > i) {
				dice3D[i].visible = true;
				const used = i < bgState.dice.length - bgState.remainingMoves.length;
				(dice3D[i].material as MeshStandardMaterial).opacity = used ? 0.3 : 1;
				(dice3D[i].material as MeshStandardMaterial).transparent = true;
			} else {
				dice3D[i].visible = false;
			}
		}

		// Render move highlights
		for (const ring of highlightRings) ring.visible = false;
		// Update doubling cube visual
		cubeMesh.visible = gameState === 'playing';
		cubeMesh.rotation.y += 0.002;
		// Scale cube slightly based on value
		const cubeScale = 1 + Math.log2(bgState.doublingCube) * 0.1;
		cubeMesh.scale.set(cubeScale, cubeScale, cubeScale);
		let ringIdx = 0;
		for (const move of highlightedMoves) {
			if (ringIdx >= highlightRings.length) break;
			const to = move[1];
			const ring = highlightRings[ringIdx];
			ring.visible = true;
			if (to === 24 || to === -2) {
				// Bear off indicator
				ring.position.set(to === 24 ? 0.85 : -0.85, 0.06, 0);
				(ring.material as MeshBasicMaterial).color.set(0x44ff44);
			} else {
				const pos = getPointWorldPos(to);
				ring.position.set(pos.x, 0.06, pos.z);
				// Red for captures
				const target = bgState.board[to];
				const targetOwner = pointOwner(target);
				const isCapture = targetOwner !== null && targetOwner !== bgState.currentPlayer && pieceCount(target) === 1;
				(ring.material as MeshBasicMaterial).color.set(isCapture ? 0xff4444 : 0x44ff44);
			}
			ringIdx++;
		}
	}

	// ============================
	// RAYCASTING FOR POINT SELECTION
	// ============================

	const raycaster = new Raycaster();
	const mouse = new Vector2();
	let lastClickTime = 0;

	function onPointerDown(event: PointerEvent) {
		if (gameState !== 'playing') return;
		if (bgState.currentPlayer !== 'white') return;
		if (bgState.gamePhase !== 'moving') return;

		const now = Date.now();
		if (now - lastClickTime < 200) return;
		lastClickTime = now;

		const canvas = world.renderer.domElement;
		const rect = canvas.getBoundingClientRect();
		mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
		mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

		raycaster.setFromCamera(mouse, world.camera);
		const intersects = raycaster.intersectObject(boardMesh, true);

		if (intersects.length > 0) {
			const hit = intersects[0].point;
			// Convert to board-local coordinates
			const localPoint = boardMesh.worldToLocal(hit.clone());

			// Check for bar click (player has pieces on bar)
			if (bgState.bar.white > 0) {
				if (Math.abs(localPoint.x) < 0.08 && Math.abs(localPoint.z) < 0.5) {
					handleBarSelect();
					return;
				}
			}

			// Find closest point
			let closestPoint = -1;
			let closestDist = 0.15;

			for (let i = 0; i < 24; i++) {
				const pos = getPointWorldPos(i);
				const dx = localPoint.x - pos.x;
				const dz = localPoint.z - pos.z;
				const dist = Math.sqrt(dx * dx + dz * dz);
				if (dist < closestDist) {
					closestDist = dist;
					closestPoint = i;
				}
			}

			// Check bear-off areas
			if (localPoint.x > 0.75) {
				handleBearOffClick();
				return;
			}

			if (closestPoint >= 0) {
				handlePointClick(closestPoint);
			}
		}
	}

	function handleBarSelect() {
		if (selectedPoint === -1) {
			selectedPoint = -2;
			highlightedMoves = [];
			renderBoard();
			return;
		}
		selectedPoint = -1;
		// Show legal moves from bar
		highlightedMoves = [];
		for (const die of bgState.remainingMoves) {
			const moves = getLegalMoves(bgState, die);
			for (const m of moves) {
				if (m[0] === -1) highlightedMoves.push([...m, die]);
			}
		}
		renderBoard();
		audio.click();
	}

	function handlePointClick(point: number) {
		// If no piece selected, select this point
		if (selectedPoint === -2 || selectedPoint === -1) {
			// Check if player owns checkers here
			const val = bgState.board[point];
			if (pointOwner(val) === 'white') {
				selectedPoint = point;
				// Show legal moves from this point
				highlightedMoves = [];
				for (const die of bgState.remainingMoves) {
					const moves = getLegalMoves(bgState, die);
					for (const m of moves) {
						if (m[0] === point) highlightedMoves.push([...m, die]);
					}
				}
				renderBoard();
				audio.click();
			} else if (selectedPoint === -2) {
				// Check if this is a valid move destination from bar
				if (bgState.bar.white > 0) {
					handleBarSelect();
				}
			}
		} else {
			// Try to move from selected to this point
			tryMove(selectedPoint, point);
		}
	}

	function handleBearOffClick() {
		if (selectedPoint >= 0) {
			tryMove(selectedPoint, 24);
		}
	}

	function tryMove(from: number, to: number) {
		// Find matching die
		for (const die of bgState.remainingMoves) {
			const legalMoves = getLegalMoves(bgState, die);
			for (const m of legalMoves) {
				if (m[0] === from && m[1] === to) {
					// Save state for undo in practice mode
					if (config.mode === 'practice') {
						moveHistory.push(cloneState(bgState));
						undoAvailable = true;
					}
					// Execute move!
					// Capture positions for move animation
					const fromPos = from === -1
						? new Vector3(0, 0.06, bgState.currentPlayer === 'white' ? 0.3 : -0.3)
						: getPointWorldPos(from).clone();
					fromPos.y += 0.008;
					const result = applyMove(bgState, from, to);
					bgState.movesMade++;
					save.totalMoves++;

					// Remove used die
					const idx = bgState.remainingMoves.indexOf(die);
					if (idx >= 0) bgState.remainingMoves.splice(idx, 1);

					if (result.hit) {
						audio.pieceHit();
						save.hitsLanded++;
						particles.burst(0, 0.8, -0.3, 0xff4444, 12);
					} else if (to === 24 || to === -2) {
						audio.bearOff();
						save.bearOffs++;
						particles.burst(0.85, 0.8, -0.3, 0x44ff44, 10);
					} else {
						audio.pieceMove();
					}

					selectedPoint = -2;
					highlightedMoves = [];

					// Trigger move animation
					renderBoard();
					// Find the checker at 'to' and animate it from the old position
					if (to !== 24 && to !== -2) {
						const toPos = getPointWorldPos(to).clone();
						const val = bgState.board[to];
						const count = pieceCount(val);
						const stackDir = to < 12 ? -1 : 1;
						toPos.z += stackDir * (Math.min(count, 5) - 1) * 0.08;
						toPos.y += 0.008;
						// Find the top checker at this point
						for (let ci = checkerMeshes.length - 1; ci >= 0; ci--) {
							const cm = checkerMeshes[ci];
							if (cm.mesh.visible) {
								const dx = Math.abs(cm.mesh.position.x - toPos.x);
								const dz = Math.abs(cm.mesh.position.z - toPos.z);
								if (dx < 0.02 && dz < 0.02) {
									moveAnim = { fromPos: fromPos.clone(), toPos: cm.mesh.position.clone(), progress: 0, checkerIdx: ci, duration: 0.25 };
									cm.mesh.position.copy(fromPos);
									break;
								}
							}
						}
					}

					// Check game over
					const winner = isGameOver(bgState);
					if (winner) {
						endGame(winner);
						return;
					}

					// Check if more moves available
					if (bgState.remainingMoves.length === 0 || !hasAnyLegalMove(bgState)) {
						endTurn();
					}

					renderBoard();
					updateHUD();
					return;
				}
			}
		}

		// Invalid move - deselect
		selectedPoint = -2;
		highlightedMoves = [];
		renderBoard();
	}

	// ============================
	// TURN MANAGEMENT
	// ============================

	function endTurn() {
		bgState.currentPlayer = bgState.currentPlayer === 'white' ? 'black' : 'white';
		bgState.gamePhase = 'rolling';
		bgState.remainingMoves = [];
		selectedPoint = -2;
		highlightedMoves = [];

		if (bgState.currentPlayer === 'black') {
			// AI might double before rolling (small chance if position is strong)
			if (canDouble(bgState, 'black') && bgState.movesMade > 4) {
				const aiEval = evaluateBoard(bgState, 'black');
				const playerEval = evaluateBoard(bgState, 'white');
				if (aiEval - playerEval > 150 && Math.random() < 0.3) {
					setTimeout(() => handleAIDouble(), 300);
					aiThinkTimer = 1.5;
				} else {
					aiThinkTimer = 0.5;
				}
			} else {
				aiThinkTimer = 0.5;
			}
		}

		renderBoard();
		updateHUD();
	}

	function undoMove() {
		if (config.mode !== 'practice' || moveHistory.length === 0) return;
		bgState = moveHistory.pop()!;
		undoAvailable = moveHistory.length > 0;
		selectedPoint = -2;
		highlightedMoves = [];
		renderBoard();
		updateHUD();
		audio.click();
		showToast('Move undone');
	}

	function saveLeaderboardScore(mode: string, score: number, winType: string) {
		const today = new Date().toISOString().split('T')[0];
		leaderboardScores.push({ mode, score, date: today, winType });
		leaderboardScores.sort((a, b) => b.score - a.score);
		if (leaderboardScores.length > 10) leaderboardScores = leaderboardScores.slice(0, 10);
		try { localStorage.setItem('neon-backgammon-leaderboard', JSON.stringify(leaderboardScores)); } catch { /* ignore */ }
	}

	function doRoll() {
		const dice = rollDice(lastRng);
		bgState.dice = dice;
		bgState.remainingMoves = getMovesForDice(dice[0], dice[1]);
		bgState.gamePhase = 'moving';

		if (dice[0] === dice[1]) {
			save.doublesRolled++;
		}

		// Update dice visuals
		for (let i = 0; i < 2; i++) {
			dice3D[i].rotation.set(
				(dice[i] - 1) * Math.PI / 3,
				Math.random() * Math.PI,
				Math.random() * Math.PI
			);
		}

		audio.diceRoll();
		renderBoard();
		updateHUD();

		// Check if any legal move exists
		if (!hasAnyLegalMove(bgState)) {
			// No legal moves - skip turn
			setTimeout(() => endTurn(), 800);
		}
	}

	function aiTurn() {
		if (bgState.gamePhase === 'rolling') {
			doRoll();
			aiThinkTimer = 0.6;
			return;
		}

		if (bgState.gamePhase === 'moving' && bgState.remainingMoves.length > 0) {
			const move = aiSelectMove(bgState, config.difficulty);
			if (move) {
				const [from, to, die] = move;
				const result = applyMove(bgState, from, to);
				bgState.movesMade++;

				const idx = bgState.remainingMoves.indexOf(die);
				if (idx >= 0) bgState.remainingMoves.splice(idx, 1);

				if (result.hit) {
					audio.pieceHit();
					particles.burst(0, 0.8, -0.3, 0xff4444, 12);
				} else if (to === 24 || to === -2) {
					audio.bearOff();
				} else {
					audio.pieceMove();
				}

				renderBoard();
				updateHUD();

				const winner = isGameOver(bgState);
				if (winner) {
					endGame(winner);
					return;
				}

				if (bgState.remainingMoves.length > 0 && hasAnyLegalMove(bgState)) {
					aiThinkTimer = 0.4;
				} else {
					endTurn();
				}
			} else {
				endTurn();
			}
		}
	}

	// ============================
	// GAME FLOW
	// ============================

	function handlePlayerDouble() {
		if (!canDouble(bgState, 'white')) return;
		const newCubeValue = bgState.doublingCube * 2;
		showToast(`Doubling to ${newCubeValue}x...`);
		audio.diceRoll();
		particles.burst(0, 1.0, 0.65, 0xffdd44, 8);

		// AI decides
		setTimeout(() => {
			if (aiAcceptsDouble(bgState)) {
				bgState.doublingCube = newCubeValue;
				bgState.cubeOwner = 'black';
				showToast(`AI accepts! Cube: ${newCubeValue}x`);
				cubeMesh.scale.set(1 + Math.log2(newCubeValue) * 0.1, 1 + Math.log2(newCubeValue) * 0.1, 1 + Math.log2(newCubeValue) * 0.1);
				updateHUD();
			} else {
				// AI declines — player wins with current cube value
				showToast(`AI declines! You win ${bgState.doublingCube} pt${bgState.doublingCube > 1 ? 's' : ''}`);
				setTimeout(() => endGame('white'), 800);
			}
		}, 600);
	}

	function handleAIDouble() {
		if (!canDouble(bgState, 'black')) return;
		const newCubeValue = bgState.doublingCube * 2;
		showToast(`AI doubles to ${newCubeValue}x!`);
		audio.diceRoll();
		particles.burst(0, 1.0, 0.65, 0xffdd44, 8);
		// Auto-accept for player (in a real game you'd prompt, but this keeps flow smooth)
		// Player always accepts if they have >= 25% chance (reasonable approximation)
		const playerScore = evaluateBoard(bgState, 'white');
		const aiScore = evaluateBoard(bgState, 'black');
		if (playerScore - aiScore > -300) {
			bgState.doublingCube = newCubeValue;
			bgState.cubeOwner = 'white';
			setTimeout(() => showToast(`Cube accepted: ${newCubeValue}x`), 600);
			updateHUD();
		} else {
			setTimeout(() => {
				showToast(`Too risky! AI wins ${bgState.doublingCube} pt${bgState.doublingCube > 1 ? 's' : ''}`);
				setTimeout(() => endGame('black'), 800);
			}, 600);
		}
	}

	function startGame() {
		bgState = newGame(config.mode);
		matchScore = { white: 0, black: 0 };
		selectedPoint = -2;
		highlightedMoves = [];
		blitzTimer = 30;
		sessionStartTime = Date.now();
		moveHistory = [];
		undoAvailable = false;

		if (config.mode === 'daily') {
			const seed = dateToSeed(new Date());
			lastRng = mulberry32(seed);
		} else {
			lastRng = undefined;
		}

		if (!save.modesPlayed.includes(config.mode)) {
			save.modesPlayed.push(config.mode);
		}

		gameState = 'countdown';
		countdownVal = 3;
		countdownTimer = 0;
		renderBoard();
	}

	function startRound() {
		gameState = 'playing';
		bgState.gamePhase = 'rolling';
		audio.startDrone();
		renderBoard();
		updateHUD();
		if (config.mode === 'practice') {
			setTimeout(() => showToast('Practice: press U to undo'), 500);
		}
	}

	function endGame(winner: PieceColor) {
		const winType = getWinType(bgState, winner);
		let points = bgState.doublingCube;
		if (winType === 'gammon') { points *= 2; save.gammons++; }
		if (winType === 'backgammon') { points *= 3; save.backgammons++; }

		if (winner === 'white') {
			matchScore.white += points;
			save.wins++;
			save.currentWinStreak++;
			if (save.currentWinStreak > save.longestWinStreak) save.longestWinStreak = save.currentWinStreak;
			save.totalPoints += points * 100;
			save.xp += points * 50;
			if (bgState.borneOff.black === 0) save.perfectGames++;
			audio.win();
			if (winType !== 'normal') audio.gammon();
			particles.burst(0, 1.2, -0.3, skin.p1, 25);
		} else {
			matchScore.black += points;
			save.losses++;
			save.currentWinStreak = 0;
			audio.lose();
		}

		save.games++;
		save.totalTime += Math.floor((Date.now() - sessionStartTime) / 1000);

		// Check if match is over
		if (config.pointsToWin > 1) {
			if (matchScore.white >= config.pointsToWin || matchScore.black >= config.pointsToWin) {
				if (matchScore.white >= config.pointsToWin) save.matchWins++;
				gameState = 'gameOver';
			} else {
				// Continue match
				bgState = newGame(config.mode);
				selectedPoint = -2;
				highlightedMoves = [];
				bgState.gamePhase = 'rolling';
				renderBoard();
				updateHUD();
				return;
			}
		} else {
			gameState = 'gameOver';
		}

		// Level up check
		while (save.xp >= (100 + save.level * 50) && save.level < 50) {
			save.xp -= (100 + save.level * 50);
			save.level++;
		}

		// Daily
		if (config.mode === 'daily') {
			const today = new Date().toISOString().split('T')[0];
			save.dailyDate = today;
			if (winner === 'white') {
				const score = bgState.movesMade;
				if (score > save.dailyBest) save.dailyBest = score;
			}
		}

		checkAchievements();
		saveSave(save);
		saveLeaderboardScore(config.mode, points * 100, winType);
		updateGameOver(winner, winType, points);
	}

	// ============================
	// PANEL UI
	// ============================

	const panelConfigs = [
		'title', 'modeselect', 'difficulty', 'hud', 'pause',
		'gameover', 'leaderboard', 'achievements', 'settings',
		'help', 'stats', 'skins', 'countdown', 'toast', 'diceroll',
	];

	const panelEntities: Map<string, ReturnType<typeof world.createTransformEntity>> = new Map();

	for (const name of panelConfigs) {
		const entity = world.createTransformEntity(new Mesh(
			new PlaneGeometry(0.01, 0.01),
			new MeshBasicMaterial({ visible: false })
		));
		entity.addComponent(PanelUI, { config: `./ui/${name}.json` });

		if (name === 'hud' || name === 'toast' || name === 'countdown' || name === 'diceroll') {
			entity.addComponent(Follower, { target: world.player.head });
			const ov = entity.getVectorView(Follower, 'offsetPosition');
			if (name === 'hud') { ov[0] = 0; ov[1] = -0.15; ov[2] = -0.6; }
			else if (name === 'toast') { ov[0] = 0; ov[1] = 0.12; ov[2] = -0.6; }
			else if (name === 'countdown') { ov[0] = 0; ov[1] = 0; ov[2] = -0.5; }
			else if (name === 'diceroll') { ov[0] = 0; ov[1] = -0.08; ov[2] = -0.55; }
		} else {
			entity.object3D!.position.set(0, 1.5, -1.5);
		}

		panelEntities.set(name, entity);
	}

	// ============================
	// UI SYSTEM
	// ============================

	const getDoc = (name: string) => {
		const e = panelEntities.get(name);
		if (!e) return undefined;
		try {
			return (PanelDocument as any).data.document[e.index] as UIKitDocument | undefined;
		} catch { return undefined; }
	};

	const setText = (panelName: string, id: string, text: string) => {
		const doc = getDoc(panelName);
		if (!doc) return;
		const el = doc.getElementById(id) as UIKit.Text | undefined;
		el?.setProperties({ text });
	};

	const setVis = (panelName: string, show: boolean) => {
		const e = panelEntities.get(panelName);
		if (e?.object3D) e.object3D.visible = show;
	};

	function showScreen(screen: GameState) {
		gameState = screen;
		const worldPanels = ['title', 'modeselect', 'difficulty', 'pause', 'gameover', 'leaderboard', 'achievements', 'settings', 'help', 'stats', 'skins'];
		const hudPanels = ['hud', 'toast', 'countdown', 'diceroll'];

		for (const p of worldPanels) {
			setVis(p, false);
		}
		for (const p of hudPanels) {
			setVis(p, screen === 'playing' && (p === 'hud' || p === 'diceroll'));
		}
		setVis('toast', screen === 'playing');

		switch (screen) {
			case 'title': setVis('title', true); updateTitle(); break;
			case 'modeSelect': setVis('modeselect', true); break;
			case 'difficulty': setVis('difficulty', true); break;
			case 'playing': setVis('hud', true); setVis('diceroll', true); break;
			case 'paused': setVis('pause', true); break;
			case 'gameOver': setVis('gameover', true); break;
			case 'achievements': setVis('achievements', true); updateAchievements(); break;
			case 'settings': setVis('settings', true); updateSettings(); break;
			case 'help': setVis('help', true); break;
			case 'leaderboard': setVis('leaderboard', true); updateLeaderboard(); break;
			case 'stats': setVis('stats', true); updateStats(); break;
			case 'skins': setVis('skins', true); updateSkins(); break;
			case 'countdown':
				setVis('countdown', true);
				setVis('hud', false);
				break;
		}
	}

	function updateTitle() {
		const title = LEVEL_TITLES[Math.min(Math.floor((save.level - 1) / 2.5), LEVEL_TITLES.length - 1)];
		setText('title', 'level-text', `Lv.${save.level} ${title}`);
	}

	function updateHUD() {
		setText('hud', 'player-text', bgState.currentPlayer === 'white' ? 'YOUR TURN' : 'AI THINKING...');
		setText('hud', 'dice-text', bgState.dice.length > 0 ? `Dice: ${bgState.dice.join(' - ')}` : 'Roll dice');
		setText('hud', 'moves-text', `Moves left: ${bgState.remainingMoves.length}`);
		setText('hud', 'score-text', `Match: ${matchScore.white} - ${matchScore.black}`);
		setText('hud', 'borne-text', `Borne off: ${bgState.borneOff.white} / ${bgState.borneOff.black}`);
		setText('hud', 'cube-text', `Cube: x${bgState.doublingCube}`);

		if (config.mode === 'blitz') {
			setText('hud', 'timer-text', `Time: ${Math.ceil(blitzTimer)}s`);
		} else {
			const wp = calcPipCount(bgState, 'white');
			const bp = calcPipCount(bgState, 'black');
			setText('hud', 'timer-text', `Pips: ${wp} vs ${bp}`);
		}

		// Dice roll button visibility
		const showRoll = bgState.currentPlayer === 'white' && bgState.gamePhase === 'rolling';
		setText('diceroll', 'roll-text', showRoll ? 'ROLL DICE' : '');
		// Doubling button - show only when player can double before rolling
		const showDouble = showRoll && canDouble(bgState, 'white') && bgState.movesMade > 0;
		setText('diceroll', 'btn-double', showDouble ? 'DOUBLE' : '');
	}

	function updateGameOver(winner: PieceColor, winType: string, points: number) {
		setText('gameover', 'result-text', winner === 'white' ? 'YOU WIN!' : 'YOU LOSE');
		setText('gameover', 'type-text', winType === 'normal' ? 'Normal win' : winType === 'gammon' ? 'GAMMON!' : 'BACKGAMMON!');
		setText('gameover', 'points-text', `Points: ${points}`);
		setText('gameover', 'moves-text', `Moves: ${bgState.movesMade}`);
		setText('gameover', 'match-text', `Match: ${matchScore.white} - ${matchScore.black}`);
		setText('gameover', 'xp-text', `+${points * 50} XP`);
	}

	function updateAchievements() {
		let unlockCount = 0;
		for (let i = 0; i < ACHIEVEMENTS.length; i++) {
			const a = ACHIEVEMENTS[i];
			const unlocked = save.achievementsUnlocked.includes(a.id);
			if (unlocked) unlockCount++;
			setText('achievements', `ach-${i}`, `${unlocked ? '[x]' : '[ ]'} ${a.name} - ${a.desc}`);
		}
		setText('achievements', 'ach-count', `${unlockCount} / ${ACHIEVEMENTS.length}`);
	}

	function updateSettings() {
		setText('settings', 'theme-text', `Theme: ${theme.name}`);
	}

	function updateStats() {
		setText('stats', 'stat-0', `Games: ${save.games}`);
		setText('stats', 'stat-1', `Wins: ${save.wins}`);
		setText('stats', 'stat-2', `Losses: ${save.losses}`);
		setText('stats', 'stat-3', `Win rate: ${save.games > 0 ? Math.round(save.wins / save.games * 100) : 0}%`);
		setText('stats', 'stat-4', `Total moves: ${save.totalMoves}`);
		setText('stats', 'stat-5', `Hits landed: ${save.hitsLanded}`);
		setText('stats', 'stat-6', `Bear offs: ${save.bearOffs}`);
		setText('stats', 'stat-7', `Best streak: ${save.longestWinStreak}`);
		setText('stats', 'stat-8', `Gammons: ${save.gammons}`);
		setText('stats', 'stat-9', `Level: ${save.level}`);
	}

	function updateSkins() {
		for (let i = 0; i < SKINS.length; i++) {
			const s = SKINS[i];
			const active = save.skinIndex === i;
			setText('skins', `skin-${i}`, `${active ? '>' : ' '} ${s.name} (${s.unlock})`);
		}
	}

	function updateLeaderboard() {
		for (let i = 0; i < 10; i++) {
			if (i < leaderboardScores.length) {
				const s = leaderboardScores[i];
				const typeLabel = s.winType === 'backgammon' ? ' BG' : s.winType === 'gammon' ? ' G' : '';
				setText('leaderboard', `lb-${i}`, `${i + 1}. ${s.score} pts${typeLabel} (${s.mode}) ${s.date}`);
			} else {
				setText('leaderboard', `lb-${i}`, `${i + 1}. ---`);
			}
		}
	}

	function showToast(msg: string) {
		setText('toast', 'toast-text', msg);
		setVis('toast', true);
		setTimeout(() => {
			if (gameState === 'playing') {
				setText('toast', 'toast-text', '');
			}
		}, 2000);
	}

	function checkAchievements() {
		for (const a of ACHIEVEMENTS) {
			if (save.achievementsUnlocked.includes(a.id)) continue;
			if (a.condition(save)) {
				save.achievementsUnlocked.push(a.id);
				showToast(`Achievement: ${a.name}!`);
				audio.achievement();
				particles.burst(0, 1.5, -0.8, 0xffdd44, 15);
			}
		}
	}

	// ============================
	// GAME UI SYSTEM (ECS)
	// ============================

	class GameUISystem extends createSystem({
		title: { required: [PanelUI, PanelDocument], where: [eq(PanelUI, 'config', './ui/title.json')] },
		modeselect: { required: [PanelUI, PanelDocument], where: [eq(PanelUI, 'config', './ui/modeselect.json')] },
		difficulty: { required: [PanelUI, PanelDocument], where: [eq(PanelUI, 'config', './ui/difficulty.json')] },
		hud: { required: [PanelUI, PanelDocument], where: [eq(PanelUI, 'config', './ui/hud.json')] },
		pause: { required: [PanelUI, PanelDocument], where: [eq(PanelUI, 'config', './ui/pause.json')] },
		gameover: { required: [PanelUI, PanelDocument], where: [eq(PanelUI, 'config', './ui/gameover.json')] },
		achievements: { required: [PanelUI, PanelDocument], where: [eq(PanelUI, 'config', './ui/achievements.json')] },
		settings: { required: [PanelUI, PanelDocument], where: [eq(PanelUI, 'config', './ui/settings.json')] },
		help: { required: [PanelUI, PanelDocument], where: [eq(PanelUI, 'config', './ui/help.json')] },
		stats: { required: [PanelUI, PanelDocument], where: [eq(PanelUI, 'config', './ui/stats.json')] },
		skins: { required: [PanelUI, PanelDocument], where: [eq(PanelUI, 'config', './ui/skins.json')] },
		countdown: { required: [PanelUI, PanelDocument], where: [eq(PanelUI, 'config', './ui/countdown.json')] },
		diceroll: { required: [PanelUI, PanelDocument], where: [eq(PanelUI, 'config', './ui/diceroll.json')] },
		leaderboard: { required: [PanelUI, PanelDocument], where: [eq(PanelUI, 'config', './ui/leaderboard.json')] },
	}) {
		init() {
			this.queries.title.subscribe('qualify', (entity) => {
				const doc = PanelDocument.data.document[entity.index] as UIKitDocument;
				if (!doc) return;
				const wire = (id: string, fn: () => void) => {
					const el = doc.getElementById(id) as UIKit.Text | undefined;
					el?.addEventListener('click', () => { audio.click(); fn(); });
				};
				wire('btn-play', () => showScreen('modeSelect'));
				wire('btn-achievements', () => showScreen('achievements'));
				wire('btn-settings', () => showScreen('settings'));
				wire('btn-help', () => showScreen('help'));
				wire('btn-stats', () => showScreen('stats'));
				wire('btn-skins', () => showScreen('skins'));
				wire('btn-scores', () => showScreen('leaderboard'));
			});

			this.queries.modeselect.subscribe('qualify', (entity) => {
				const doc = PanelDocument.data.document[entity.index] as UIKitDocument;
				if (!doc) return;
				for (const mode of MODES) {
					const el = doc.getElementById(`btn-${mode.id}`) as UIKit.Text | undefined;
					el?.addEventListener('click', () => {
						audio.click();
						config.mode = mode.id;
						config.pointsToWin = mode.id === 'match3' ? 3 : mode.id === 'match5' ? 5 : 1;
						showScreen('difficulty');
					});
				}
				const back = doc.getElementById('btn-back') as UIKit.Text | undefined;
				back?.addEventListener('click', () => { audio.click(); showScreen('title'); });
			});

			this.queries.difficulty.subscribe('qualify', (entity) => {
				const doc = PanelDocument.data.document[entity.index] as UIKitDocument;
				if (!doc) return;
				for (const d of ['Easy', 'Medium', 'Hard']) {
					const el = doc.getElementById(`btn-${d.toLowerCase()}`) as UIKit.Text | undefined;
					el?.addEventListener('click', () => {
						audio.click();
						config.difficulty = d;
						startGame();
					});
				}
				const back = doc.getElementById('btn-back') as UIKit.Text | undefined;
				back?.addEventListener('click', () => { audio.click(); showScreen('modeSelect'); });
			});

			this.queries.pause.subscribe('qualify', (entity) => {
				const doc = PanelDocument.data.document[entity.index] as UIKitDocument;
				if (!doc) return;
				const resume = doc.getElementById('btn-resume') as UIKit.Text | undefined;
				resume?.addEventListener('click', () => { audio.click(); showScreen('playing'); });
				const quit = doc.getElementById('btn-quit') as UIKit.Text | undefined;
				quit?.addEventListener('click', () => { audio.click(); saveSave(save); showScreen('title'); });
			});

			this.queries.gameover.subscribe('qualify', (entity) => {
				const doc = PanelDocument.data.document[entity.index] as UIKitDocument;
				if (!doc) return;
				const rematch = doc.getElementById('btn-rematch') as UIKit.Text | undefined;
				rematch?.addEventListener('click', () => { audio.click(); startGame(); });
				const menu = doc.getElementById('btn-menu') as UIKit.Text | undefined;
				menu?.addEventListener('click', () => { audio.click(); showScreen('title'); });
			});

			this.queries.achievements.subscribe('qualify', (entity) => {
				const doc = PanelDocument.data.document[entity.index] as UIKitDocument;
				if (!doc) return;
				const back = doc.getElementById('btn-back') as UIKit.Text | undefined;
				back?.addEventListener('click', () => { audio.click(); showScreen('title'); });
			});

			this.queries.settings.subscribe('qualify', (entity) => {
				const doc = PanelDocument.data.document[entity.index] as UIKitDocument;
				if (!doc) return;
				const wire = (id: string, fn: () => void) => {
					const el = doc.getElementById(id) as UIKit.Text | undefined;
					el?.addEventListener('click', () => { audio.click(); fn(); });
				};
				wire('btn-theme-prev', () => {
					save.themeIndex = (save.themeIndex - 1 + THEMES.length) % THEMES.length;
					theme = THEMES[save.themeIndex];
					updateSettings();
					saveSave(save);
				});
				wire('btn-theme-next', () => {
					save.themeIndex = (save.themeIndex + 1) % THEMES.length;
					theme = THEMES[save.themeIndex];
					updateSettings();
					saveSave(save);
				});
				wire('btn-back', () => showScreen('title'));
			});

			this.queries.help.subscribe('qualify', (entity) => {
				const doc = PanelDocument.data.document[entity.index] as UIKitDocument;
				if (!doc) return;
				const back = doc.getElementById('btn-back') as UIKit.Text | undefined;
				back?.addEventListener('click', () => { audio.click(); showScreen('title'); });
			});

			this.queries.stats.subscribe('qualify', (entity) => {
				const doc = PanelDocument.data.document[entity.index] as UIKitDocument;
				if (!doc) return;
				const back = doc.getElementById('btn-back') as UIKit.Text | undefined;
				back?.addEventListener('click', () => { audio.click(); showScreen('title'); });
			});

			this.queries.skins.subscribe('qualify', (entity) => {
				const doc = PanelDocument.data.document[entity.index] as UIKitDocument;
				if (!doc) return;
				for (let i = 0; i < SKINS.length; i++) {
					const el = doc.getElementById(`btn-skin-${i}`) as UIKit.Text | undefined;
					el?.addEventListener('click', () => {
						audio.click();
						save.skinIndex = i;
						skin = SKINS[i];
						updateSkins();
						renderBoard();
						saveSave(save);
					});
				}
				const back = doc.getElementById('btn-back') as UIKit.Text | undefined;
				back?.addEventListener('click', () => { audio.click(); showScreen('title'); });
			});

			this.queries.leaderboard.subscribe('qualify', (entity) => {
				const doc = PanelDocument.data.document[entity.index] as UIKitDocument;
				if (!doc) return;
				const back = doc.getElementById('btn-back') as UIKit.Text | undefined;
				back?.addEventListener('click', () => { audio.click(); showScreen('title'); });
			});

			this.queries.diceroll.subscribe('qualify', (entity) => {
				const doc = PanelDocument.data.document[entity.index] as UIKitDocument;
				if (!doc) return;
				const el = doc.getElementById('btn-roll') as UIKit.Text | undefined;
				el?.addEventListener('click', () => {
					if (bgState.currentPlayer === 'white' && bgState.gamePhase === 'rolling' && gameState === 'playing') {
						audio.click();
						doRoll();
					}
				});
				const doubleEl = doc.getElementById('btn-double') as UIKit.Text | undefined;
				doubleEl?.addEventListener('click', () => {
					if (bgState.currentPlayer === 'white' && bgState.gamePhase === 'rolling' && gameState === 'playing') {
						if (canDouble(bgState, 'white')) {
							audio.click();
							handlePlayerDouble();
						}
					}
				});
			});
		}
	}

	world.registerSystem(GameUISystem);

	// ============================
	// MAIN GAME LOOP SYSTEM
	// ============================

	class GameLoopSystem extends createSystem({}) {
		update(delta: number) {
			const dt = Math.min(delta, 0.1);

			// Particles
			particles.update(dt);

			// Decorations animation
			const time = Date.now() / 1000;
			for (const d of decorations) {
				d.mesh.rotation.x += d.speed * dt;
				d.mesh.rotation.y += d.speed * 0.7 * dt;
				d.mesh.position.y = d.baseY + Math.sin(time * d.bobSpeed) * 0.1;
			}

			// Ambient particles
			for (const p of ambientParticles) {
				p.mesh.position.y = p.baseY + Math.sin(time * p.speed + p.phase) * 0.15;
				(p.mesh.material as MeshBasicMaterial).opacity = 0.2 + Math.sin(time * p.speed * 2 + p.phase) * 0.15;
			}

			// Dice rolling animation
			if (bgState.dice.length > 0 && gameState === 'playing') {
				for (let i = 0; i < 2; i++) {
					if (moveAnimTimer < 0.3) {
						dice3D[i].rotation.x += 8 * dt;
						dice3D[i].rotation.z += 6 * dt;
					}
				}
			}

			// Move animation
			if (moveAnim) {
				moveAnim.progress += dt / moveAnim.duration;
				if (moveAnim.progress >= 1) {
					moveAnim = null;
					renderBoard();
				} else {
					const t = moveAnim.progress;
					// Cubic ease-out
					const ease = 1 - Math.pow(1 - t, 3);
					const cm = checkerMeshes[moveAnim.checkerIdx];
					if (cm && cm.mesh.visible) {
						cm.mesh.position.lerpVectors(moveAnim.fromPos, moveAnim.toPos, ease);
						// Arc height
						cm.mesh.position.y += Math.sin(t * Math.PI) * 0.08;
					}
				}
			}

			// Countdown
			if (gameState === 'countdown') {
				countdownTimer += dt;
				if (countdownTimer >= 1) {
					countdownTimer = 0;
					countdownVal--;
					if (countdownVal > 0) {
						setText('countdown', 'countdown-text', String(countdownVal));
						audio.countdown();
					} else {
						setText('countdown', 'countdown-text', 'ROLL!');
						audio.countdownGo();
						setTimeout(() => {
							setVis('countdown', false);
							startRound();
						}, 500);
					}
				}
			}

			// AI turn
			if (gameState === 'playing' && bgState.currentPlayer === 'black') {
				aiThinkTimer -= dt;
				if (aiThinkTimer <= 0) {
					aiTurn();
				}
			}

			// Blitz timer
			if (gameState === 'playing' && config.mode === 'blitz' && bgState.currentPlayer === 'white') {
				blitzTimer -= dt;
				updateHUD();
				if (blitzTimer <= 0) {
					// Auto-forfeit
					endGame('black');
				}
				if (blitzTimer <= 5 && Math.floor(blitzTimer) !== Math.floor(blitzTimer + dt)) {
					audio.countdown();
				}
			}

			// Keyboard input
			const kb = (world.input as any).keyboard;
			if (kb.getKeyDown('Escape') || kb.getKeyDown('KeyP')) {
				if (gameState === 'playing') showScreen('paused');
				else if (gameState === 'paused') showScreen('playing');
			}
			if (kb.getKeyDown('Space') && gameState === 'playing') {
				if (bgState.currentPlayer === 'white' && bgState.gamePhase === 'rolling') {
					doRoll();
				}
			}
			if (kb.getKeyDown('Enter') && gameState === 'playing') {
				if (bgState.currentPlayer === 'white' && bgState.gamePhase === 'rolling') {
					doRoll();
				}
			}
			if (kb.getKeyDown('KeyU') && gameState === 'playing') {
				undoMove();
			}
			if (kb.getKeyDown('KeyR') && gameState === 'gameOver') {
				startGame();
			}

			// XR input
			const right = (world.input as any).xr?.gamepads?.right;
			if (right) {
				if (right.getButtonDown(InputComponent.Trigger)) {
					if (gameState === 'playing' && bgState.currentPlayer === 'white' && bgState.gamePhase === 'rolling') {
						doRoll();
					}
				}
				if (right.getButtonDown(InputComponent.B_Button)) {
					if (gameState === 'playing') showScreen('paused');
					else if (gameState === 'paused') showScreen('playing');
				}
			}

			moveAnimTimer += dt;
		}
	}

	world.registerSystem(GameLoopSystem);

	// Register pointer events
	world.renderer.domElement.addEventListener('pointerdown', onPointerDown);
	world.renderer.domElement.addEventListener('contextmenu', (e: Event) => {
		e.preventDefault();
		if (gameState === 'playing') {
			selectedPoint = -2;
			highlightedMoves = [];
			renderBoard();
		}
	});

	// Hover tracking for visual feedback
	world.renderer.domElement.addEventListener('pointermove', (event: PointerEvent) => {
		if (gameState !== 'playing' || bgState.currentPlayer !== 'white' || bgState.gamePhase !== 'moving') {
			if (hoveredPoint !== -2) { hoveredPoint = -2; }
			return;
		}
		const canvas = world.renderer.domElement;
		const rect = canvas.getBoundingClientRect();
		mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
		mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
		raycaster.setFromCamera(mouse, world.camera);
		const intersects = raycaster.intersectObject(boardMesh, true);
		if (intersects.length > 0) {
			const localPoint = boardMesh.worldToLocal(intersects[0].point.clone());
			let closest = -2;
			let closestDist = 0.15;
			for (let i = 0; i < 24; i++) {
				const pos = getPointWorldPos(i);
				const dx = localPoint.x - pos.x;
				const dz = localPoint.z - pos.z;
				const dist = Math.sqrt(dx * dx + dz * dz);
				if (dist < closestDist) { closestDist = dist; closest = i; }
			}
			hoveredPoint = closest;
		} else {
			hoveredPoint = -2;
		}
	});

	// Initial state
	showScreen('title');
	renderBoard();
}

main();
