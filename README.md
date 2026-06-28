# Neon Backgammon VR

A holodeck-style VR backgammon game built with IWSDK 0.4.1. Roll neon dice, move glowing checkers around a holographic board, and play against an AI opponent with multiple difficulty levels.

## Play

**Live:** [https://ellyz2426.github.io/neon-backgammon/](https://ellyz2426.github.io/neon-backgammon/)

## Features

- **Full backgammon engine** - Complete rules including en passant captures, bar re-entry, bearing off, gammon/backgammon detection
- **AI opponent** - Three difficulty levels (Easy random, Medium with noise, Hard with board evaluation)
- **8 game modes** - Single Game, Match to 3, Match to 5, Daily Challenge, Blitz (30s timer), Practice, Nackgammon variant, Hypergammon variant
- **30 achievements** - Career milestones, gameplay goals, collection challenges
- **8 piece skins** - Unlockable color schemes
- **5 holodeck themes** - Neon Holodeck, Crimson Arena, Toxic Neon, Ultra Violet, Solar Blaze
- **XP/Level progression** - 50 levels with 20 titles
- **All spatial UI** - 15 PanelUI panels, zero HTML DOM
- **Dual runtime** - Works in VR and browser
- **Procedural audio** - Dice roll, piece move, hit, bear off, win/lose, ambient drone

## Controls

### Browser
- **Space** - Roll dice
- **Click** - Select/move checker
- **Esc/P** - Pause
- **R** - Rematch (game over)

### VR
- **Trigger** - Roll dice / interact
- **Pointer** - Aim at board/menus
- **B** - Pause

## Tech

- IWSDK 0.4.1 (Immersive Web SDK)
- TypeScript, Vite, PanelUI spatial UI
- Custom backgammon engine with full rule support
- AI with board evaluation heuristics
- Procedural Web Audio
