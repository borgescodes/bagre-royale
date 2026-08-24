# Bagre Royale

Interactive web project for tracking leagues, seasons, tournaments, standings and player statistics in the Bagre Royale universe.

**Live demo:** https://borgescodes.github.io/bagre-royale/

## Overview

Bagre Royale started as a study project and evolved into a themed statistics and competition website. The application organizes historical championships, season data, tournament views, awards and player profiles in a custom interface built with vanilla web technologies.

The project focuses on frontend architecture, data-driven rendering and reusable competition logic without relying on a framework.

## Features

- Historical league and tournament navigation
- Season and round views
- Competition standings
- Player and team statistics
- Awards and historical records
- Reusable competition data structures
- Responsive interface
- GitHub Pages deployment

## Architecture

```text
Static data
   |
   v
Competition engine
   |
   +--> League history
   +--> Seasons and rounds
   +--> Tournaments
   +--> Statistics
   |
   v
Vanilla JavaScript UI
```

The repository separates data, competition logic and page-specific behavior. `engine.js` contains shared logic, while files such as `main.js`, `season.js` and `rounds.js` render different views from the project data.

## Main areas

```text
.
├── assets/              # visual identity and interface assets
├── awards/              # awards and historical records
├── bagres/              # player-related views
├── data/                # competition datasets
├── data.js              # shared application data
├── engine.js            # reusable competition logic
├── main.js              # home and championship rendering
├── season.js            # season-specific behavior
├── rounds.js            # round views
├── copa-bagre.js        # tournament behavior
└── index.html            # application entry point
```

## Stack

- HTML
- CSS
- JavaScript
- Static structured data
- GitHub Pages

## Engineering highlights

- Data-driven rendering without a frontend framework
- Separation between data and presentation logic
- Reusable competition calculations
- Multiple application views sharing the same domain data
- Custom responsive visual identity
- Static deployment with no backend dependency

## Running locally

Clone the repository and serve it with any static HTTP server. For example, VS Code Live Server can be used to open `index.html` and navigate between the application pages.

## Status

Active portfolio project and historical home of the Bagre Royale competitions.
