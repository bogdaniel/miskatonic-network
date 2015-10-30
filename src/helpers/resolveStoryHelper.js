"use strict";

exports.iconStruggle = function (struggle, playerCards, opponentCards) {
    var playerScore = 0;
    var opponentScore = 0;
    struggle = struggle.toLowerCase();

    if (playerCards) {
        playerCards.forEach(function (card) {
            playerScore += card[struggle];
        });
    }

    if (opponentCards) {
        opponentCards.forEach(function (card) {
            opponentScore += card[struggle];
        });
    }

    if (playerScore == opponentScore) {
        return 'tie';
    }

    if (playerScore > opponentScore) {
        return 'player';
    }

    return 'opponent';
};

exports.determineSuccess = function (playerCards, opponentCards) {
    var playerScore = 0;
    var opponentScore = 0;
    var result = {
        success: false,
        unchallenged: false
    };

    if (playerCards) {
        playerCards.forEach(function (card) {
            playerScore += card.skill;
        });
    }

    if (opponentCards) {
        opponentCards.forEach(function (card) {
            opponentScore += card.skill;
        });
    }

    if (playerScore > opponentScore) {
        result.success = true;
    }

    if (result.success && opponentScore < 1) {
        result.unchallenged = true;
    }

    return result;
};
