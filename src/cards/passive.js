"use strict";

var Promise = require('bluebird');
var Card = require('../database/redis/card');
var committed = require('../database/redis/committed');

exports.execute = function (game, data) {
    var promises = [];
    var attachmentCards = data.attachmentCards;
    var playerPlayed = data.playerPlayed;
    var opponentPlayed = data.opponentPlayed;
    var playerCommitted1 = data.playerCommitted1;
    var opponentCommitted1 = data.opponentCommitted1;
    var playerCommitted2 = data.playerCommitted2;
    var opponentCommitted2 = data.opponentCommitted2;
    var playerCommitted3 = data.playerCommitted3;
    var opponentCommitted3 = data.opponentCommitted3;
    var playerCommitted4 = data.playerCommitted4;
    var opponentCommitted4 = data.opponentCommitted4;
    var playerCommitted5 = data.playerCommitted5;
    var opponentCommitted5 = data.opponentCommitted5;
    var allCards = playerPlayed.concat(
        opponentPlayed, playerCommitted1, opponentCommitted1, playerCommitted2, opponentCommitted2,
        playerCommitted3, opponentCommitted3, playerCommitted4, opponentCommitted4, playerCommitted5,
        opponentCommitted5
    );

    var numberOfCharacterCards = 0;

    allCards.forEach(function (card) {
        card.cost = card.printedCost;
        card.skill = card.printedSkill;
        card.terror = card.printedTerror;
        card.combat = card.printedCombat;
        card.arcane = card.printedArcane;
        card.investigation = card.printedInvestigation;
        card.toughness = card.printedToughness;
        card.keyword = card.printedKeyword;

        if (card.type == 'character') {
            numberOfCharacterCards++;
        }
    });

    allCards.forEach(function (card) {
        if (card.uid == 2) {
            if (card.position == 'committed') {
                allCards.forEach(function (card) {
                    if (card.keyword.indexOf('Heroic') > -1) {
                        card.combat++;
                        promises.push(Card.update(game.id, card));
                    }

                    if (card.keyword.indexOf('Villianous') > -1) {
                        if (card.terror > 0) {
                            card.terror--;
                            promises.push(Card.update(game.id, card));
                        }
                    }
                });
            }
        }

        if (card.uid == 5) {
            if (numberOfCharacterCards > 5 && card.status != 'insane') {
                if (card.position == 'played') {
                    card.status = 'insane';
                    promises.push(Card.update(game.id, card));
                } else if (card.position == 'committed') {
                    promises.push(committed.goInsane(game.id, card.ownerId, card.committedStory, card.id));
                }
            }
        }

        if (card.uid == 11) {
            if (attachmentCards.length > 0) {
                card.keyword.push('Willpower');
                promises.push(Card.update(game.id, card));
            }
        }

        if (card.uid == 23) {
            if (card.position == 'committed') {
                allCards.forEach(function (card) {
                    card.toughness = 0;
                    promises.push(Card.update(game.id, card));
                });
            }
        }
    });

    return Promise.all(promises);
};
